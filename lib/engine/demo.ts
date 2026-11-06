import type { Address, Step, Token, VenueAdapter } from "./types";
import { getAmountOut } from "./adapters/amm";
import { createBridgeAdapter } from "./adapters/bridge";

/**
 * Seeded demo liquidity used when deployments.json is empty (contracts not
 * deployed yet). The math is the same constant-product quote the on-chain
 * Router uses, so the UI can be explored before a testnet deploy. Every
 * response is flagged as demo mode so the UI can label it and disable
 * execution.
 */

const addr = (n: number): Address => `0x${n.toString(16).padStart(40, "0")}` as Address;

const USDC_SEPOLIA = addr(0x1001);
const POT_SEPOLIA = addr(0x1002);
const USDC_PORTALDOT = addr(0x2001);
const POT_PORTALDOT = addr(0x2002);

const TOKENS: Token[] = [
  { chainId: 11155111, address: USDC_SEPOLIA, symbol: "mUSDC", decimals: 18, priceUsd: 1 },
  { chainId: 11155111, address: POT_SEPOLIA, symbol: "mPOT", decimals: 18, priceUsd: 0.08 },
  { chainId: 420420777, address: USDC_PORTALDOT, symbol: "mUSDC", decimals: 18, priceUsd: 1 },
  { chainId: 420420777, address: POT_PORTALDOT, symbol: "mPOT", decimals: 18, priceUsd: 0.08 },
];

const E18 = 10n ** 18n;

interface DemoPool {
  chainId: number;
  usdc: Address;
  pot: Address;
  usdcReserve: bigint;
  potReserve: bigint;
  feeBps: number;
  gasUsd: number;
  etaSeconds: number;
}

function pool(chainId: number, usdc: Address, pot: Address, usdcLiq: string, potLiq: string, feeBps: number, gasUsd: number, etaSeconds: number): DemoPool {
  return {
    chainId,
    usdc,
    pot,
    usdcReserve: BigInt(usdcLiq) * E18,
    potReserve: BigInt(potLiq) * E18,
    feeBps,
    gasUsd,
    etaSeconds,
  };
}

const POOLS: DemoPool[] = [
  // Sepolia: two fee tiers, slightly different price ratios.
  pool(11155111, USDC_SEPOLIA, POT_SEPOLIA, "100000", "1250000", 30, 0.2, 12),
  pool(11155111, USDC_SEPOLIA, POT_SEPOLIA, "80000", "920000", 10, 0.2, 12),
  // Portaldot: same shape, cheaper gas and faster blocks.
  pool(420420777, USDC_PORTALDOT, POT_PORTALDOT, "100000", "1250000", 30, 0.05, 6),
  pool(420420777, USDC_PORTALDOT, POT_PORTALDOT, "80000", "920000", 10, 0.05, 6),
];

function createDemoAmm(p: DemoPool): VenueAdapter {
  return {
    id: `miniamm-${p.chainId}-${p.feeBps}bps`,
    kind: "amm",
    chainFrom: p.chainId,
    chainTo: p.chainId,
    async getQuote(tokenIn, tokenOut, amountIn): Promise<Step | null> {
      if (amountIn <= 0n) return null;
      if (tokenIn.chainId !== p.chainId || tokenOut.chainId !== p.chainId) return null;
      const inIsUsdc = tokenIn.address.toLowerCase() === p.usdc.toLowerCase();
      const outIsPot = tokenOut.address.toLowerCase() === p.pot.toLowerCase();
      const inIsPot = tokenIn.address.toLowerCase() === p.pot.toLowerCase();
      const outIsUsdc = tokenOut.address.toLowerCase() === p.usdc.toLowerCase();
      if (!((inIsUsdc && outIsPot) || (inIsPot && outIsUsdc))) return null;

      const reserveIn = inIsUsdc ? p.usdcReserve : p.potReserve;
      const reserveOut = inIsUsdc ? p.potReserve : p.usdcReserve;
      const amountOut = getAmountOut(amountIn, reserveIn, reserveOut, p.feeBps);
      if (amountOut <= 0n) return null;

      const spotOut = (amountIn * reserveOut) / reserveIn;
      const priceImpactBps = spotOut > 0n ? Number(((spotOut - amountOut) * 10_000n) / spotOut) : 0;
      const amountInUsd = (Number(amountIn) / 10 ** tokenIn.decimals) * tokenIn.priceUsd;

      return {
        venueId: `miniamm-${p.chainId}-${p.feeBps}bps`,
        kind: "amm",
        chainFrom: p.chainId,
        chainTo: p.chainId,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        feeUsd: (amountInUsd * p.feeBps) / 10_000,
        gasUsd: p.gasUsd,
        priceImpactBps,
        etaSeconds: p.etaSeconds,
        riskPenaltyUsd: 0,
      };
    },
  };
}

export function getDemoTokens(): Token[] {
  return [...TOKENS];
}

export function getDemoVenues(): VenueAdapter[] {
  return [
    ...POOLS.map(createDemoAmm),
    createBridgeAdapter({
      id: "simbridge-sepolia-portaldot",
      chainFrom: 11155111,
      chainTo: 420420777,
      feeBps: 30,
      flatFeeUsd: 0.5,
      etaSeconds: 300,
      riskPenaltyUsd: 2,
    }),
    createBridgeAdapter({
      id: "simbridge-portaldot-sepolia",
      chainFrom: 420420777,
      chainTo: 11155111,
      feeBps: 30,
      flatFeeUsd: 0.5,
      etaSeconds: 300,
      riskPenaltyUsd: 2,
    }),
  ];
}
