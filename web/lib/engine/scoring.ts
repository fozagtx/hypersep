import type { Route, Step, Token } from "./types";

/**
 * Multi-criteria route scoring:
 *   score = output value
 *         − gas cost
 *         − price-impact cost
 *         − time penalty
 *         − venue risk penalty
 */
export const WEIGHTS = {
  gasUsd: 1.0,
  impactUsd: 1.0,
  /** USD penalty per second of expected settlement time. */
  timeUsdPerSec: 0.002,
  riskUsd: 1.0,
};

export function buildRoute(steps: Step[], amountIn: bigint, tokenOut: Token): Route {
  // Chain amounts through the steps so multi-hop outputs are amount-aware.
  let amount = amountIn;
  const adjusted: Step[] = steps.map((s) => {
    const step = { ...s, amountIn: amount };
    amount = s.amountOut; // edges were quoted at the original amount; pass output through
    return step;
  });
  const amountOut = adjusted.length > 0 ? adjusted[adjusted.length - 1].amountOut : 0n;

  const outUsd = (Number(amountOut) / 10 ** tokenOut.decimals) * tokenOut.priceUsd;
  const totalFeeUsd = adjusted.reduce((sum, s) => sum + s.feeUsd, 0);
  const totalGasUsd = adjusted.reduce((sum, s) => sum + s.gasUsd, 0);
  const impactUsd = adjusted.reduce((sum, s) => {
    const inUsd = (Number(s.amountIn) / 10 ** s.tokenIn.decimals) * s.tokenIn.priceUsd;
    return sum + (inUsd * s.priceImpactBps) / 10_000;
  }, 0);
  const totalEtaSeconds = adjusted.reduce((sum, s) => sum + s.etaSeconds, 0);
  const riskPenaltyUsd = adjusted.reduce((sum, s) => sum + s.riskPenaltyUsd, 0);

  const score =
    outUsd -
    totalGasUsd * WEIGHTS.gasUsd -
    impactUsd * WEIGHTS.impactUsd -
    totalEtaSeconds * WEIGHTS.timeUsdPerSec -
    riskPenaltyUsd * WEIGHTS.riskUsd;

  return {
    steps: adjusted,
    amountIn,
    amountOut,
    totalFeeUsd,
    totalGasUsd,
    totalImpactUsd: impactUsd,
    totalEtaSeconds,
    score,
    labels: [],
  };
}

/** Tag the best/cheapest/fastest routes within a sorted candidate list. */
export function labelRoutes(routes: Route[]): void {
  if (routes.length === 0) return;
  routes[0].labels.push("Best overall");

  const cheapest = routes.reduce((a, b) =>
    a.totalFeeUsd + a.totalGasUsd <= b.totalFeeUsd + b.totalGasUsd ? a : b
  );
  if (!cheapest.labels.includes("Cheapest")) cheapest.labels.push("Cheapest");

  const fastest = routes.reduce((a, b) => (a.totalEtaSeconds <= b.totalEtaSeconds ? a : b));
  if (!fastest.labels.includes("Fastest")) fastest.labels.push("Fastest");
}
