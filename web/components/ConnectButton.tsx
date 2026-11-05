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
    <div className="row" style={{ gap: 8, alignItems: "center" }}>
      {Object.values(CHAINS_BY_ID).map((c) => (
        <button
          key={c.id}
          onClick={() => switchChain(c.id)}
          style={{
            background: c.id === chainId ? "var(--accent)" : "transparent",
            border: "1px solid var(--border)",
            color: c.id === chainId ? "#fff" : "var(--muted)",
            padding: "6px 10px",
            fontSize: 12,
          }}
        >
          {c.name.replace("Ethereum ", "").replace(" V3 Testnet", "")}
        </button>
      ))}
      <span className="badge">
        {address.slice(0, 6)}…{address.slice(-4)}
      </span>
      <button
        onClick={() => disconnect()}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--muted)",
          padding: "6px 10px",
          fontSize: 12,
        }}
      >
        Disconnect
      </button>
    </div>
  );
}
