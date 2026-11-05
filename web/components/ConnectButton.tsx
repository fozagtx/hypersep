"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { CHAINS_BY_ID } from "@/lib/chains";

export function ConnectButton() {
  const { address, isConnected, chainId, connect, disconnect, switchChain } = useWallet();
  const [connecting, setConnecting] = useState(false);

  if (!isConnected || !address) {
    return (
      <button
        className="btn-primary"
        onClick={async () => {
          setConnecting(true);
          try {
            await connect();
          } catch {
            /* user rejected or no wallet */
          } finally {
            setConnecting(false);
          }
        }}
        disabled={connecting}
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {Object.values(CHAINS_BY_ID).map((c) => (
        <button
          key={c.id}
          className={`chip-btn${c.id === chainId ? " on" : ""}`}
          onClick={() => switchChain(c.id)}
        >
          {c.name.replace("Ethereum ", "").replace(" V3 Testnet", "")}
        </button>
      ))}
      <span className="badge-addr">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <button className="chip-btn" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
