"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { useWallet } from "@/hooks/useWallet";
import { RouteCard } from "./RouteCard";
import { ExecutionPanel } from "./ExecutionPanel";
import { buildFaucetAction, sendWalletTx } from "@/lib/execution";
import type { ApiQuote, ApiRoute, DeploymentMap } from "@/lib/types";

const CHAIN_OPTIONS = [
  { value: "11155111", label: "Ethereum Sepolia" },
  { value: "420420777", label: "Portaldot V3 Testnet" },
];

const TOKEN_OPTIONS = ["mUSDC", "mPOT"];

export function TradeDashboard() {
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

  const resultsRef = useRef<HTMLDivElement | null>(null);

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
      const q = data as ApiQuote;
      setQuote(q);
      if (q.routes?.length) setSelectedRoute(q.routes[0]);
      requestAnimationFrame(() => resultsRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
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
      setFaucetState(`Minted 1,000 ${fromToken} - tx ${hash.slice(0, 10)}…`);
    } catch (e) {
      setFaucetState(`Faucet failed: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return (
    <>
      <div className="dashboard-head">
        <div>
          <p className="label">Dashboard</p>
          <h1>Trade across chains</h1>
          <p className="sub">
            {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Wallet not connected"}. One
            quote, every venue, ranked by total cost.
          </p>
        </div>
        <button className="chip-btn" onClick={faucet} disabled={!isConnected}>
          Get test tokens
        </button>
      </div>
      {faucetState && <p className="footer-note">{faucetState}</p>}

      <div className="dashboard-grid">
        <div className="swap-card">
          <div className="panel-head">
            <h2>Find a route</h2>
            <span className="tag">Sepolia to Portaldot</span>
          </div>

          <div className="leg">
            <div>
              <label className="label">You pay - Chain</label>
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

          <div className="leg leg-receive">
            <div>
              <label className="label">You receive - Chain</label>
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
              <button className="btn btn-white" onClick={getRoutes} disabled={loading} style={{ width: "100%" }}>
                {loading ? "Routing…" : "Find best route"}
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-results" ref={resultsRef}>
          {error && <p className="warning">{error}</p>}
          {quote?.warnings.map((w) => (
            <p key={w} className="warning">{w}</p>
          ))}

          {quote && quote.routes.length > 0 && (
            <>
              <div className="routes-head">
                <h2>{quote.routes.length} routes found</h2>
                <span className="routes-count">ranked by total cost - {fromToken} to {toToken}</span>
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
              Enter an amount and press Find best route. Every venue and bridge path gets ranked.
            </div>
          )}

          {selectedRoute && isConnected && address && !quote?.demo && (
            <div style={{ marginTop: 24 }}>
              <ExecutionPanel route={selectedRoute} deployments={deployments} userAddress={address} />
            </div>
          )}
          {selectedRoute && !isConnected && !quote?.demo && (
            <p className="warning" style={{ marginTop: 20 }}>Connect your wallet to execute this route.</p>
          )}
        </div>
      </div>

      <section className="contracts-panel">
        <div className="panel-head">
          <h2>Contracts</h2>
          <span className="tag">Portaldot V3 testnet · 420420777</span>
        </div>

        {Object.keys(deployments).length === 0 ? (
          <div className="contract-empty">
            <p>Not deployed yet. Fund the deployer with tPOT, then run the deploy script.</p>
            <div className="contract-grid">
              <div className="contract-card">
                <div className="k">Deployer EVM</div>
                <code>0x421D297A9d9ba5112Ede43E96F83a54C4e4AafDb</code>
              </div>
              <div className="contract-card">
                <div className="k">Deployer native</div>
                <code>5DZPgRPx9vvXf2FuSsm3WzVXBwhQkTSaCnP3yWT7s2inqpyr</code>
              </div>
            </div>
            <p className="contract-note">
              Run <code>contracts/scripts/deploy.ts</code> after funding the deployer, then this
              panel fills with Factory, Router, Bridge, token, and pool addresses.
            </p>
          </div>
        ) : (
          Object.entries(deployments).map(([chainId, dep]) => (
            <div key={chainId} className="contract-chain">
              <div className="contract-chain-head">
                <span>Chain {chainId}</span>
                <span>{dep.network}</span>
              </div>
              <div className="contract-grid">
                {[
                  ["Factory", dep.factory],
                  ["Router", dep.router],
                  ["Bridge", dep.bridge],
                  ...Object.entries(dep.tokens).map(([s, a]) => [`Token ${s}`, a]),
                  ...Object.entries(dep.pairs).map(([k, a]) => [k, a]),
                ].map(([label, addr]) => (
                  <div className="contract-card" key={`${chainId}-${label}`}>
                    <div className="k">{label}</div>
                    <code>{addr}</code>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

      </section>
    </>
  );
}
