// Client-safe types shared by the UI and execution layer.
// (lib/engine/* is server-side: it imports fs.)

export interface ApiStep {
  venueId: string;
  kind: "amm" | "bridge";
  chainFrom: number;
  chainTo: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  feeUsd: number;
  gasUsd: number;
  priceImpactBps: number;
  etaSeconds: number;
}

export interface ApiRoute {
  labels: string[];
  amountIn: string;
  amountOut: string;
  totalFeeUsd: number;
  totalGasUsd: number;
  totalImpactUsd: number;
  priceImpactPct: number;
  totalEtaSeconds: number;
  score: number;
  steps: ApiStep[];
}

export interface ApiQuote {
  routes: ApiRoute[];
  warnings: string[];
  priceSource: string;
}

export interface DeploymentEntry {
  network: string;
  deployedAt: string;
  factory: string;
  router: string;
  bridge: string;
  relayer: string;
  tokens: Record<string, string>;
  pairs: Record<string, string>;
  txHashes: Record<string, string>;
}

export type DeploymentMap = Record<string, DeploymentEntry>;
