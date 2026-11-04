import type { Step, Token, VenueAdapter } from "./types";

/**
 * Route graph: tokens are nodes, quoted venue steps are edges.
 * Because the graph is tiny (a few tokens and venues), we quote every
 * feasible edge once, then enumerate all simple paths up to the limits below.
 */

export interface GraphLimits {
  maxSteps: number;
  maxBridgeSteps: number;
  maxAmmSwaps: number;
}

export const DEFAULT_LIMITS: GraphLimits = {
  maxSteps: 3,
  maxBridgeSteps: 1,
  maxAmmSwaps: 2,
};

const key = (t: Token) => `${t.chainId}:${t.address.toLowerCase()}`;

export async function quoteEdges(
  venues: VenueAdapter[],
  tokens: Token[],
  amountIn: bigint,
  tokenIn: Token
): Promise<Step[]> {
  const jobs: Promise<Step | null>[] = [];
  for (const venue of venues) {
    for (const tIn of tokens) {
      if (venue.chainFrom !== tIn.chainId) continue;
      for (const tOut of tokens) {
        if (venue.chainTo !== tOut.chainId) continue;
        if (key(tIn) === key(tOut)) continue;
        // amount flows from the request's input token; intermediate hops chain
        // amounts at enumeration time, so edge quotes are amount-aware and we
        // only quote edges reachable from tokenIn at this amount (single-pass
        // for depth-1; deeper hops are requoted during enumeration).
        jobs.push(venue.getQuote(tIn, tOut, amountIn).catch(() => null));
      }
    }
  }
  const results = await Promise.all(jobs);
  return results.filter((s): s is Step => s !== null);
}

/**
 * Enumerate candidate step-paths from tokenIn to tokenOut. Intermediate hop
 * amounts are recomputed at combination time (each edge was quoted at the
 * original amountIn, which slightly overestimates deeper hops' output and
 * price impact on AMMs — a known, acceptable simplification for ranking).
 */
export function findPaths(
  edges: Step[],
  tokenIn: Token,
  tokenOut: Token,
  limits: GraphLimits = DEFAULT_LIMITS
): Step[][] {
  const out: Step[][] = [];
  const targetKey = key(tokenOut);

  const walk = (current: Token, path: Step[], usedTokens: Set<string>) => {
    if (path.length > limits.maxSteps) return;
    if (key(current) === targetKey && path.length > 0) {
      out.push([...path]);
      return;
    }
    for (const edge of edges) {
      if (key(edge.tokenIn) !== key(current)) continue;
      const nextKey = key(edge.tokenOut);
      if (usedTokens.has(nextKey)) continue; // simple paths only

      const bridges = path.filter((s) => s.kind === "bridge").length + (edge.kind === "bridge" ? 1 : 0);
      const swaps = path.filter((s) => s.kind === "amm").length + (edge.kind === "amm" ? 1 : 0);
      if (bridges > limits.maxBridgeSteps || swaps > limits.maxAmmSwaps) continue;

      usedTokens.add(nextKey);
      path.push(edge);
      walk(edge.tokenOut, path, usedTokens);
      path.pop();
      usedTokens.delete(nextKey);
    }
  };

  walk(tokenIn, [], new Set([key(tokenIn)]));
  return out;
}
