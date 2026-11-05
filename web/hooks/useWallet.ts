"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { CHAINS_BY_ID } from "@/lib/chains";

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<any>;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
}

function getEth(): EthereumProvider {
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!eth) throw new Error("No wallet found — install MetaMask or another injected wallet.");
  return eth;
}

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
}

/** Minimal injected-wallet state via EIP-1193 (no wagmi needed). */
export function useWallet(): WalletState {
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth) return;

    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) setAddress(accounts[0] as Address);
    }).catch(() => {});
    eth.request({ method: "eth_chainId" }).then((id: string) => {
      setChainId(Number(id));
    }).catch(() => {});

    const onAccounts = (...args: any[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts?.[0] ? (accounts[0] as Address) : null);
    };
    const onChain = (...args: any[]) => setChainId(Number(args[0]));

    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = getEth();
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    if (accounts[0]) setAddress(accounts[0] as Address);
    const id = (await eth.request({ method: "eth_chainId" })) as string;
    setChainId(Number(id));
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const switchChain = useCallback(async (target: number) => {
    const eth = getEth();
    const hexId = "0x" + target.toString(16);
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        const chain = CHAINS_BY_ID[target];
        if (!chain) throw new Error(`Unsupported chain ${target}`);
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexId,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: chain.rpcUrls.default.http,
              blockExplorerUrls: [chain.blockExplorers?.default.url],
            },
          ],
        });
      } else {
        throw e;
      }
    }
    setChainId(target);
  }, []);

  return {
    address,
    chainId,
    isConnected: !!address,
    connect,
    disconnect,
    switchChain,
  };
}
