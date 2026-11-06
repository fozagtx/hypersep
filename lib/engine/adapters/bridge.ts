import type { Step, VenueAdapter } from "../types";

interface BridgeAdapterConfig {
  id: string;
  chainFrom: number;
  chainTo: number;
  /** Bridge fee in basis points on the bridged notional. */
  feeBps: number;
  /** Flat fee in USD, deducted from the output. */
  flatFeeUsd: number;
  etaSeconds: number;
  /** Optimizer risk/reliability penalty in USD for this bridge. */
  riskPenaltyUsd: number;
}

/**
 * Simulated bridge adapter — clearly labeled. Quotes same-symbol transfers
 * between chains at parity minus fees. Swap this for a real bridge integration
 * (e.g. Portaldot iBridge) once testnet API access is confirmed; the interface
 * does not change.
 */
export function createBridgeAdapter(cfg: BridgeAdapterConfig): VenueAdapter {
  return {
    id: cfg.id,
    kind: "bridge",
    chainFrom: cfg.chainFrom,
    chainTo: cfg.chainTo,
    async getQuote(tokenIn, tokenOut, amountIn): Promise<Step | null> {
      const sameSymbol = tokenIn.symbol === tokenOut.symbol;
      const directionOk = tokenIn.chainId === cfg.chainFrom && tokenOut.chainId === cfg.chainTo;
      if (!sameSymbol || !directionOk || amountIn <= 0n) return null;

      const amountInUsd = (Number(amountIn) / 10 ** tokenIn.decimals) * tokenIn.priceUsd;
      const feeUsd = (amountInUsd * cfg.feeBps) / 10_000;
      const amountOutUsd = amountInUsd - feeUsd - cfg.flatFeeUsd;
      if (amountOutUsd <= 0) return null;

      const amountOut = BigInt(
        Math.floor((amountOutUsd / tokenOut.priceUsd) * 10 ** tokenOut.decimals)
      );
      if (amountOut <= 0n) return null;

      return {
        venueId: cfg.id,
        kind: "bridge",
        chainFrom: cfg.chainFrom,
        chainTo: cfg.chainTo,
        tokenIn,
        tokenOut,
        amountIn,
        amountOut,
        feeUsd: feeUsd + cfg.flatFeeUsd,
        gasUsd: 0.1,
        priceImpactBps: 0,
        etaSeconds: cfg.etaSeconds,
        riskPenaltyUsd: cfg.riskPenaltyUsd,
      };
    },
  };
}
