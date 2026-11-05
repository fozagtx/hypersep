import { defineChain } from "viem";

export const portaldot = defineChain({
  id: 420420777,
  name: "Portaldot V3 Testnet",
  nativeCurrency: { name: "POT", symbol: "POT", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_PORTALDOT_RPC || "https://test-evm-rpc-v3.portaldot.dev"] },
  },
  blockExplorers: {
    default: { name: "Portaldot Node Console", url: "https://node-console.portaldot.dev" },
  },
  testnet: true,
});

export const sepolia = defineChain({
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://rpc.sepolia.org"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

export const CHAINS_BY_ID: Record<number, typeof sepolia | typeof portaldot> = {
  [sepolia.id]: sepolia,
  [portaldot.id]: portaldot,
};

export function explorerTxUrl(chainId: number, hash: string): string {
  const base = CHAINS_BY_ID[chainId]?.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : "#";
}
