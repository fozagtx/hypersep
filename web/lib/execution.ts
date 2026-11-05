import { encodeFunctionData, type Address, type Hex } from "viem";
import { BRIDGE_ABI, ERC20_ABI, ROUTER_ABI } from "./abis";
import type { ApiRoute, DeploymentMap } from "./types";

export interface TxAction {
  id: string;
  stepIndex: number;
  type: "approve" | "swap" | "bridge-deposit" | "bridge-release";
  chainId: number;
  label: string;
  to?: Address;
  data?: Hex;
  value?: bigint;
  /** bridge-release actions are executed by the server-side relayer. */
  relay?: { depositActionId: string; srcChainId: number; destChainId: number };
}

const SLIPPAGE_BPS = 50n; // 0.5%

function feeBpsFromVenueId(venueId: string): number {
  const m = venueId.match(/-(\d+)bps$/);
  return m ? Number(m[1]) : 30;
}

/**
 * Turn a quoted route into the ordered list of on-chain transactions needed
 * to execute it: approvals, swaps through the MiniAMM router, and bridge
 * deposit + relayer release pairs.
 */
export function buildActions(
  route: ApiRoute,
  deployments: DeploymentMap,
  userAddress: Address
): TxAction[] {
  const actions: TxAction[] = [];
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  route.steps.forEach((step, stepIndex) => {
    const src = deployments[String(step.chainFrom)];
    const dest = deployments[String(step.chainTo)];
    if (!src) throw new Error(`No deployment for chain ${step.chainFrom} — run the deploy script first.`);

    const tokenIn = src.tokens[step.tokenIn] as Address | undefined;
    const tokenOut = (dest ?? src).tokens[step.tokenOut] as Address | undefined;
    if (!tokenIn || !tokenOut) throw new Error(`Token addresses missing for ${step.tokenIn}/${step.tokenOut}.`);

    const amountIn = BigInt(step.amountIn);
    const minOut = (BigInt(step.amountOut) * (10_000n - SLIPPAGE_BPS)) / 10_000n;

    if (step.kind === "amm") {
      const router = src.router as Address;
      const feeBps = feeBpsFromVenueId(step.venueId);

      actions.push({
        id: `approve-${stepIndex}`,
        stepIndex,
        type: "approve",
        chainId: step.chainFrom,
        label: `Approve ${step.tokenIn} for MiniAMM router`,
        to: tokenIn,
        data: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [router, amountIn] }),
      });

      actions.push({
        id: `swap-${stepIndex}`,
        stepIndex,
        type: "swap",
        chainId: step.chainFrom,
        label: `Swap ${step.tokenIn} → ${step.tokenOut} via ${step.venueId}`,
        to: router,
        data: encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [amountIn, minOut, [tokenIn, tokenOut], [feeBps], userAddress, deadline],
        }),
      });
    } else {
      const bridge = src.bridge as Address;

      actions.push({
        id: `approve-bridge-${stepIndex}`,
        stepIndex,
        type: "approve",
        chainId: step.chainFrom,
        label: `Approve ${step.tokenIn} for Hypersep Bridge`,
        to: tokenIn,
        data: encodeFunctionData({ abi: ERC20_ABI, functionName: "approve", args: [bridge, amountIn] }),
      });

      const depositAction: TxAction = {
        id: `bridge-deposit-${stepIndex}`,
        stepIndex,
        type: "bridge-deposit",
        chainId: step.chainFrom,
        label: `Lock ${step.tokenIn} on chain ${step.chainFrom}`,
        to: bridge,
        data: encodeFunctionData({
          abi: BRIDGE_ABI,
          functionName: "deposit",
          args: [tokenIn, amountIn, BigInt(step.chainTo), userAddress],
        }),
      };
      actions.push(depositAction);

      actions.push({
        id: `bridge-release-${stepIndex}`,
        stepIndex,
        type: "bridge-release",
        chainId: step.chainTo,
        label: `Relayer releases ${step.tokenIn} on chain ${step.chainTo}`,
        relay: { depositActionId: depositAction.id, srcChainId: step.chainFrom, destChainId: step.chainTo },
      });
    }
  });

  return actions;
}

/** Faucet: mint demo tokens to the connected wallet (testnet-only contracts). */
export function buildFaucetAction(
  tokenAddress: Address,
  symbol: string,
  userAddress: Address
): TxAction {
  return {
    id: `faucet-${symbol}`,
    stepIndex: -1,
    type: "approve", // neutral type; executed as a plain contract call
    chainId: 0, // caller supplies the chain when sending
    label: `Mint 1,000 ${symbol} test tokens`,
    to: tokenAddress,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "mint",
      args: [userAddress, 10n ** 21n],
    }),
  };
}

/**
 * Send one action from the user's wallet: switch to the right chain (adding it
 * first if the wallet doesn't know it), then send the transaction and wait for
 * the receipt. Returns the tx hash. Client-only.
 */
export async function sendWalletTx(action: TxAction, chainId: number, account: Address): Promise<Hex> {
  if (typeof window === "undefined") throw new Error("sendWalletTx is client-only");
  const eth = (window as unknown as { ethereum?: any }).ethereum;
  if (!eth) throw new Error("No wallet found — install MetaMask or another injected wallet.");

  const { createWalletClient, createPublicClient, custom, http } = await import("viem");
  const { CHAINS_BY_ID } = await import("./chains");
  const chain = CHAINS_BY_ID[chainId];
  if (!chain) throw new Error(`Unsupported chain ${chainId}`);

  const wallet = createWalletClient({ account, chain, transport: custom(eth) });

  try {
    await wallet.switchChain({ id: chainId });
  } catch (e: any) {
    // 4902 = chain not added to the wallet yet
    if (e?.code === 4902 || e?.walk?.()?.code === 4902) {
      await wallet.addChain({ chain });
      await wallet.switchChain({ id: chainId });
    } else {
      throw e;
    }
  }

  const hash = await wallet.sendTransaction({
    account,
    chain,
    to: action.to!,
    data: action.data!,
    value: action.value ?? 0n,
  });

  const publicClient = createPublicClient({ chain, transport: http() });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
  return hash;
}
