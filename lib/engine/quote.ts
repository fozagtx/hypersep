import type { QuoteRequest, Route, Token } from "./types";
import { getTokens, getVenues, isDemoMode } from "./registry";
import { findPaths, quoteEdges } from "./graph";
import { buildRoute, labelRoutes } from "./scoring";

export interface QuoteResult {
  routes: Route[];
  warnings: string[];
  /** Mock oracle disclaimer surfaced to the UI. */
  priceSource: string;
  /** True when quotes come from seeded demo liquidity, not deployed contracts. */
  demo: boolean;
}

export async function getTopRoutes(req: QuoteRequest, topK = 3): Promise<QuoteResult> {
  const warnings: string[] = [];
  const demo = isDemoMode();
  const tokens = getTokens();
  const venues = getVenues();

  if (!demo && venues.length <= 2) {
    warnings.push("No AMM venues deployed yet. Run contracts/scripts/deploy.ts to create pools.");
  }

  const edges = await quoteEdges(venues, tokens, req.amountIn, req.tokenIn);
  const paths = findPaths(edges, req.tokenIn, req.tokenOut);

  // Re-quote each path sequentially so multi-hop amounts are exact: every hop
  // is priced with the real output of the previous hop, not the original input.
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const routes = [];
  for (const path of paths) {
    let amount = req.amountIn;
    const steps = [];
    let ok = true;
    for (const s of path) {
      const venue = venueById.get(s.venueId);
      const quoted = venue ? await venue.getQuote(s.tokenIn, s.tokenOut, amount).catch(() => null) : null;
      if (!quoted) {
        ok = false;
        break;
      }
      steps.push(quoted);
      amount = quoted.amountOut;
    }
    if (ok && steps.length > 0) {
      routes.push(buildRoute(steps, req.amountIn, req.tokenOut));
    }
  }
  routes.sort((a, b) => b.score - a.score);

  // Deduplicate identical venue sequences
  const seen = new Set<string>();
  const unique = routes.filter((r) => {
    const sig = r.steps.map((s) => s.venueId).join(">");
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });

  const top = unique.slice(0, topK);
  labelRoutes(top);

  if (top.length === 0) {
    warnings.push("No route found for this pair. Check deployments.json and token availability.");
  }

  return {
    routes: top,
    warnings,
    priceSource: demo
      ? "demo mode: seeded liquidity, contracts not deployed yet"
      : "mock testnet oracle (static prices), labeled in UI",
    demo,
  };
}

export type { QuoteRequest, Route, Token };
