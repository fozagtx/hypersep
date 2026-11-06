export type Address = `0x${string}`;

export interface Token {
  chainId: number;
  address: Address;
  symbol: string;
  decimals: number;
  /** Mock testnet oracle price (USD), clearly labeled in the UI. */
  priceUsd: number;
}

export interface Step {
  venueId: string;
  kind: "amm" | "bridge";
  chainFrom: number;
  chainTo: number;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: bigint;
  amountOut: bigint;
  feeUsd: number;
  gasUsd: number;
  priceImpactBps: number;
  etaSeconds: number;
  /** Risk/reliability penalty in USD applied by the optimizer. */
  riskPenaltyUsd: number;
}

export interface Route {
  steps: Step[];
  amountIn: bigint;
  amountOut: bigint;
  totalFeeUsd: number;
  totalGasUsd: number;
  totalImpactUsd: number;
  totalEtaSeconds: number;
  score: number;
  labels: string[];
}

export interface QuoteRequest {
  tokenIn: Token;
  tokenOut: Token;
  amountIn: bigint;
}

export interface VenueAdapter {
  id: string;
  kind: "amm" | "bridge";
  chainFrom: number;
  chainTo: number;
  /** Returns null when the venue cannot serve this pair/amount. */
  getQuote(tokenIn: Token, tokenOut: Token, amountIn: bigint): Promise<Step | null>;
}
