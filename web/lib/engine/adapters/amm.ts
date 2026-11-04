import { createPublicClient, http, parseAbi } from "viem";
import type { Step, Token, VenueAdapter } from "../types";

const PAIR_ABI = parseAbi([
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
  "function feeBps() view returns (uint16)",
]);

interface AmmAdapterConfig {
  id: string;
  chainId: number;
  rpcUrl: string;
  pairAddress: `0x${string}`;
  tokenA: Token;
  tokenB: Token;
  feeBps: number;
  gasUsd: number;
  etaSeconds: number;
}

/** Constant-product quote identical to Router.getAmountOut on-chain. */
export function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, feeBps: number): bigint {
  const FEE_DENOM = 10_000n;
  const amountInWithFee = amountIn * (FEE_DENOM - BigInt(feeBps));
  return (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOM + amountInWithFee);
}

export function createAmmAdapter(cfg: AmmAdapterConfig): VenueAdapter {
  const client = createPublicClient({ transport: http(cfg.rpcUrl) });
  const poolTokens = [cfg.tokenA, cfg.tokenB];

  return {
    id: cfg.id,
    kind: "amm",
    chainFrom: cfg.chainId,
    chainTo: cfg.chainId,
    async getQuote(tokenIn, tokenOut, amountIn): Promise<Step | null> {
      const servesPair =
        poolTokens.some((t) => t.address.toLowerCase() === tokenIn.address.toLowerCase()) &&
        poolTokens.some((t) => t.address.toLowerCase() === tokenOut.address.toLowerCase()) &&
        tokenIn.address.toLowerCase() !== tokenOut.address.toLowerCase() &&
        tokenIn.chainId === cfg.chainId &&
        tokenOut.chainId === cfg.chainId;
      if (!servesPair || amountIn <= 0n) return null;

      try {
        const [reserves, token0] = await Promise.all([
          client.readContract({ address: cfg.pairAddress, abi: PAIR_ABI, functionName: "getReserves" }),
          client.readContract({ address: cfg.pairAddress, abi: PAIR_ABI, functionName: "token0" }),
        ]);
        const [reserve0, reserve1] = reserves as readonly [bigint, bigint, number];
        const inIsToken0 = tokenIn.address.toLowerCase() === (token0 as string).toLowerCase();
        const reserveIn = inIsToken0 ? reserve0 : reserve1;
        const reserveOut = inIsToken0 ? reserve1 : reserve0;
        if (reserveIn === 0n || reserveOut === 0n) return null;

        const amountOut = getAmountOut(amountIn, reserveIn, reserveOut, cfg.feeBps);
        if (amountOut <= 0n) return null;

        // price impact vs. spot
        const spotOut = (amountIn * reserveOut) / reserveIn;
        const priceImpactBps = spotOut > 0n ? Number(((spotOut - amountOut) * 10_000n) / spotOut) : 0;

        const amountInUsd = Number(amountIn) / 10 ** tokenIn.decimals * tokenIn.priceUsd;
        const feeUsd = (amountInUsd * cfg.feeBps) / 10_000;

        return {
          venueId: cfg.id,
          kind: "amm",
          chainFrom: cfg.chainId,
          chainTo: cfg.chainId,
          tokenIn,
          tokenOut,
          amountIn,
          amountOut,
          feeUsd,
          gasUsd: cfg.gasUsd,
          priceImpactBps,
          etaSeconds: cfg.etaSeconds,
          riskPenaltyUsd: 0,
        };
      } catch {
        // venue unreachable (not deployed / RPC error) — route around it
        return null;
      }
    },
  };
}
