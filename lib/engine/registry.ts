import type { Address, Token, VenueAdapter } from "./types";
import { createAmmAdapter } from "./adapters/amm";
import { createBridgeAdapter } from "./adapters/bridge";
import { getDemoTokens, getDemoVenues } from "./demo";
import deploymentsJson from "./deployments.json";

// ------------------------------------------------------------------ chains

export const CHAINS: Record<
  number,
  { name: string; rpcUrl: string; blockTimeSec: number; swapGasUsd: number }
> = {
  420420777: {
    name: "Portaldot V3 Testnet",
    rpcUrl: process.env.PORTALDOT_RPC || "https://test-evm-rpc-v3.portaldot.dev",
    blockTimeSec: 6,
    swapGasUsd: 0.05,
  },
  11155111: {
    name: "Ethereum Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
    blockTimeSec: 12,
    swapGasUsd: 0.2,
  },
};

// --------------------------------------------------- static token metadata

const TOKEN_META: Record<string, { decimals: number; priceUsd: number }> = {
  mUSDC: { decimals: 18, priceUsd: 1.0 },
  mPOT: { decimals: 18, priceUsd: 0.08 }, // mock oracle price, clearly labeled
};

// -------------------------------------------------------- deployments.json
// Written by contracts/scripts/deploy.ts. { "<chainId>": { factory, router,
// tokens: { mUSDC, mPOT }, pairs: { "USDC/POT@30": "0x..." }, txHashes } }

export interface Deployment {
  network: string;
  deployedAt: string;
  factory: Address;
  router: Address;
  bridge: Address;
  relayer: Address;
  tokens: Record<string, Address>;
  pairs: Record<string, Address>;
  txHashes: Record<string, string>;
}

export function loadDeployments(): Record<string, Deployment> {
  // Imported at build time so the file is bundled reliably on serverless
  // hosts (Vercel). Rerun the deploy script, then rebuild, to pick up new
  // contract addresses.
  return (deploymentsJson ?? {}) as Record<string, Deployment>;
}

/** True when no contracts have been deployed yet, so quotes use demo liquidity. */
export function isDemoMode(): boolean {
  return Object.keys(loadDeployments()).length === 0;
}

// ---------------------------------------------------------- token registry

export function getTokens(): Token[] {
  const deployments = loadDeployments();
  if (Object.keys(deployments).length === 0) return getDemoTokens();

  const tokens: Token[] = [];
  for (const [chainIdKey, dep] of Object.entries(deployments)) {
    const chainId = Number(chainIdKey);
    for (const [symbol, address] of Object.entries(dep.tokens)) {
      const meta = TOKEN_META[symbol] ?? { decimals: 18, priceUsd: 1 };
      tokens.push({ chainId, address, symbol, decimals: meta.decimals, priceUsd: meta.priceUsd });
    }
  }
  return tokens;
}

export function findToken(symbol: string, chainId: number): Token | undefined {
  return getTokens().find((t) => t.symbol === symbol && t.chainId === chainId);
}

// ---------------------------------------------------------- venue registry

export function getVenues(): VenueAdapter[] {
  const deployments = loadDeployments();
  if (Object.keys(deployments).length === 0) return getDemoVenues();

  const venues: VenueAdapter[] = [];

  for (const [chainIdKey, dep] of Object.entries(deployments)) {
    const chainId = Number(chainIdKey);
    const chain = CHAINS[chainId];
    if (!chain) continue;

    for (const [pairKey, pairAddress] of Object.entries(dep.pairs)) {
      // pairKey format: "USDC/POT@30"
      const [pairSymbols, feeStr] = pairKey.split("@");
      const [symA, symB] = pairSymbols.split("/");
      const feeBps = Number(feeStr);
      const tokenA = findToken(symA, chainId);
      const tokenB = findToken(symB, chainId);
      if (!tokenA || !tokenB) continue;

      venues.push(
        createAmmAdapter({
          id: `miniamm-${chainId}-${feeBps}bps`,
          chainId,
          rpcUrl: chain.rpcUrl,
          pairAddress,
          tokenA,
          tokenB,
          feeBps,
          gasUsd: chain.swapGasUsd,
          etaSeconds: chain.blockTimeSec,
        })
      );
    }
  }

  // Simulated bridge adapter (clearly labeled). Replace with a real bridge
  // integration (e.g. Portaldot iBridge) once the team confirms testnet API
  // access — only this file changes.
  venues.push(
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
    })
  );

  return venues;
}
