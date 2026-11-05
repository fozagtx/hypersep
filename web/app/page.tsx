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
      setFaucetState("Token not deployed yet - run the deploy script first.");
      return;
    }
    setFaucetState("Confirm in your wallet…");
    try {
      const action = buildFaucetAction(tokenAddr, fromToken, address);
      const hash = await sendWalletTx(action, Number(fromChain), address);
      setFaucetState(`✓ Minted 1,000 ${fromToken} - tx ${hash.slice(0, 10)}…`);
    } catch (e) {
      setFaucetState(`⚠ ${e instanceof Error ? e.message : "Faucet failed"}`);
    }
  }

  return (
    <main>
      <header className="header">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">PortalX</div>
          </div>
          <span className="tag">Testnet</span>
        </div>
        <ConnectButton />
      </header>

      <div>
        <span className="eyebrow">
          <span className="dot" />
          Portaldot Hacker House · Multi-Chain &amp; Cross-Chain Infra
        </span>
        <h1>
          Trade across chains
          <br />
          <span className="dim">at the best route.</span>
        </h1>
        <p className="subtitle">
          Compare every venue on Portaldot and EVM chains. Ranked by total cost: fees, gas,
          price impact, and settlement time.
        </p>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Find a route</h2>
          <button className="chip-btn" onClick={faucet} disabled={!isConnected}>
            Get test tokens
          </button>
        </div>

        <div className="leg">
          <div>
            <label className="label">You pay · chain</label>
            <select value={fromChain} onChange={(e) => setFromChain(e.target.value)}>
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Token</label>
            <select value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
              {TOKEN_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grow">
            <label className="label">Amount</label>
            <input value={amountIn} onChange={(e) => setAmountIn(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <div className="leg-divider">
          <span className="leg-arrow">↓</span>
        </div>

        <div className="leg">
          <div>
            <label className="label">You receive · chain</label>
            <select value={toChain} onChange={(e) => setToChain(e.target.value)}>
              {CHAIN_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Token</label>
            <select value={toToken} onChange={(e) => setToToken(e.target.value)}>
              {TOKEN_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grow" style={{ textAlign: "right" }}>
            <button className="btn-primary" onClick={getRoutes} disabled={loading} style={{ width: "100%" }}>
              {loading ? "Routing…" : "Compare routes"}
            </button>
          </div>
        </div>

        {faucetState && <p className="footer-note">{faucetState}</p>}
      </div>

      {error && <p className="warning">⚠ {error}</p>}
      {quote?.warnings.map((w) => (
        <p key={w} className="warning">⚠ {w}</p>
      ))}

      {quote && quote.routes.length > 0 && (
        <>
          <div className="routes-head">
            <h2>{quote.routes.length} routes found</h2>
            <span className="routes-count">ranked by total cost · {fromToken} → {toToken}</span>
          </div>
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

      {!quote && !error && (
        <div className="empty">
          Enter an amount and press Compare routes. Every venue and bridge path gets ranked.
        </div>
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
