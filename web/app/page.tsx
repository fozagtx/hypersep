"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import type { Address } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { RouteCard } from "@/components/RouteCard";
import { ExecutionPanel } from "@/components/ExecutionPanel";
import { buildFaucetAction, sendWalletTx } from "@/lib/execution";
import type { ApiQuote, ApiRoute, DeploymentMap } from "@/lib/types";

const CHAIN_OPTIONS = [
  { value: "11155111", label: "Ethereum Sepolia" },
  { value: "420420777", label: "Portaldot V3 Testnet" },
];

const TOKEN_OPTIONS = ["mUSDC", "mPOT"];

export default function Home() {
  const { address, isConnected } = useWallet();

  const [fromChain, setFromChain] = useState("11155111");
  const [fromToken, setFromToken] = useState("mUSDC");
  const [toChain, setToChain] = useState("420420777");
  const [toToken, setToToken] = useState("mPOT");
  const [amountIn, setAmountIn] = useState("100");

  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<ApiQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<ApiRoute | null>(null);
  const [deployments, setDeployments] = useState<DeploymentMap>({});
  const [faucetState, setFaucetState] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deployments")
      .then((r) => r.json())
      .then((d) => setDeployments(d.deployments ?? {}))
      .catch(() => setDeployments({}));
  }, []);

  async function getRoutes() {
    setLoading(true);
    setError(null);
    setQuote(null);
    setSelectedRoute(null);
    try {
      const qs = new URLSearchParams({ fromChain, fromToken, toChain, toToken, amountIn });
      const res = await fetch(`/api/quote?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Quote failed");
      setQuote(data as ApiQuote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quote failed");
    } finally {
      setLoading(false);
    }
  }

  async function faucet() {
    if (!address || !isConnected) return;
    const chainTokens = deployments[fromChain]?.tokens;
    const tokenAddr = chainTokens?.[fromToken] as Address | undefined;
    if (!tokenAddr) {
      setFaucetState("Token not deployed yet — run the deploy script first.");
      return;
    }
    setFaucetState("Confirm in your wallet…");
    try {
      const action = buildFaucetAction(tokenAddr, fromToken, address);
      const hash = await sendWalletTx(action, Number(fromChain), address);
      setFaucetState(`✓ Minted 1,000 ${fromToken} — tx ${hash.slice(0, 10)}…`);
    } catch (e) {
      setFaucetState(`⚠ ${e instanceof Error ? e.message : "Faucet failed"}`);
    }
  }

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        <div>
          <span className="badge accent">Portaldot Hacker House · Multi-Chain &amp; Cross-Chain Infra</span>
          <h1>PortalX</h1>
          <p className="subtitle">
            Cross-chain liquidity aggregator — discover, compare, and execute the best swap routes
            across Portaldot V3 and external EVM chains.
          </p>
        </div>
        <ConnectButton />
      </div>

      <div className="card">
        <h2>Get routes</h2>
        <div className="row">
          <div>
            <label>From chain</label>
            <select value={fromChain} onChange={(e) => setFromChain(e.target.value)}>
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Token</label>
            <select value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
              {TOKEN_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Amount</label>
            <input value={amountIn} onChange={(e) => setAmountIn(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label>To chain</label>
            <select value={toChain} onChange={(e) => setToChain(e.target.value)}>
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Token</label>
            <select value={toToken} onChange={(e) => setToToken(e.target.value)}>
              {TOKEN_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <button onClick={getRoutes} disabled={loading}>
            {loading ? "Routing…" : "Compare routes"}
          </button>
          <button
            onClick={faucet}
            disabled={!isConnected}
            style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            Get test tokens
          </button>
        </div>
        {faucetState && <p className="footer-note" style={{ marginTop: 10 }}>{faucetState}</p>}
      </div>

      {error && <p className="warning">⚠ {error}</p>}
      {quote?.warnings.map((w) => (
        <p key={w} className="warning">⚠ {w}</p>
      ))}

      {quote && quote.routes.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>{quote.routes.length} routes found</h2>
          {quote.routes.map((r, i) => (
            <RouteCard
              key={i}
              route={r}
              toToken={toToken}
              selected={selectedRoute === r}
              onSelect={() => setSelectedRoute(r)}
            />
          ))}
          <p className="footer-note">Price source: {quote.priceSource}</p>
        </>
      )}

      {selectedRoute && isConnected && address && (
        <div style={{ marginTop: 24 }}>
          <ExecutionPanel route={selectedRoute} deployments={deployments} userAddress={address} />
        </div>
      )}
      {selectedRoute && !isConnected && (
        <p className="warning" style={{ marginTop: 20 }}>⚠ Connect your wallet to execute this route.</p>
      )}
    </main>
  );
}
