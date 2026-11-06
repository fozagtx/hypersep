"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { CHAINS_BY_ID } from "@/lib/chains";
import { EthereumMark, PortaldotMark } from "@/components/logos";

export function ConnectButton() {
  const { address, isConnected, chainId, connect, disconnect, switchChain } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();

  if (!isConnected || !address) {
    return (
      <div className="mgb mgb--header">
        <button
          className="mgb-btn"
          onClick={async () => {
            setConnecting(true);
            try {
              await connect();
              router.push("/dashboard");
            } catch {
              /* user rejected or no wallet */
            } finally {
              setConnecting(false);
            }
          }}
          disabled={connecting}
        >
          <span className="mgb-label">
            {connecting ? "Connecting" : "Connect"}
            <span className="mgb-shine" aria-hidden="true" />
          </span>
          <span className="mgb-ring" aria-hidden="true" />
        </button>
        <div className="mgb-shadow" aria-hidden="true">
          <span />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {Object.values(CHAINS_BY_ID).map((c) => (
        <button
          key={c.id}
          className={`chip-btn${c.id === chainId ? " on" : ""}`}
          onClick={() => switchChain(c.id)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {c.id === 11155111 ? <EthereumMark size={11} /> : <PortaldotMark size={11} />}
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
