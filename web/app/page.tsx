"use client";

import { useState } from "react";

interface ApiStep {
  venueId: string;
  kind: "amm" | "bridge";
  chainFrom: number;
  chainTo: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  feeUsd: number;
  gasUsd: number;
  priceImpactBps: number;
  etaSeconds: number;
}

interface ApiRoute {
  labels: string[];
  amountIn: string;
  amountOut: string;
  totalFeeUsd: number;
  totalGasUsd: number;
  totalImpactUsd: number;
  totalEtaSeconds: number;
  score: number;
  steps: ApiStep[];
}

interface ApiQuote {
  routes: ApiRoute[];
  warnings: string[];
  priceSource: string;
}

const CHAIN_OPTIONS = [
  { value: "11155111", label: "Ethereum Sepolia" },
  { value: "420420777", label: "Portaldot V3 Testnet" },
];

const TOKEN_OPTIONS = ["mUSDC", "mPOT"];

function fmtAmount(raw: string, decimals = 18): string {
  const n = Number(raw) / 10 ** decimals;
  if (n === 0) return "0";
  if (n < 0.001) return "<0.001";
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function fmtEta(sec: number): string {
  if (sec < 60) return `~${sec}s`;
  return `~${Math.round(sec / 60)}min`;
}

export default function Home() {
  const [fromChain, setFromChain] = useState("11155111");
  const [fromToken, setFromToken] = useState("mUSDC");
  const [toChain, setToChain] = useState("420420777");
  const [toToken, setToToken] = useState("mPOT");
  const [amountIn, setAmountIn] = useState("100");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<ApiQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getRoutes() {
    setLoading(true);
    setError(null);
    setQuote(null);
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

  return (
    <main>
      <span className="badge accent">Portaldot Hacker House · Multi-Chain &amp; Cross-Chain Infra</span>
      <h1>PortalX</h1>
      <p className="subtitle">
        Cross-chain liquidity aggregator — discover, compare, and route swaps across Portaldot V3
        and external EVM chains.
      </p>

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
        </div>
      </div>

      {error && <p className="warning">⚠ {error}</p>}
      {quote?.warnings.map((w) => (
        <p key={w} className="warning">⚠ {w}</p>
      ))}

      {quote && quote.routes.length > 0 && (
        <>
          <h2 style={{ marginTop: 24 }}>{quote.routes.length} routes found</h2>
          {quote.routes.map((r, i) => (
            <div className="card route-card" key={i}>
              <div className="labels">
                {r.labels.map((l) => (
                  <span key={l} className="badge accent">{l}</span>
                ))}
              </div>
              <div className="route-stats">
                <div>
                  You receive<br />
                  <strong>{fmtAmount(r.amountOut)} {toToken}</strong>
                </div>
                <div>
                  Fees + gas<br />
                  <strong>${(r.totalFeeUsd + r.totalGasUsd).toFixed(2)}</strong>
                </div>
                <div>
                  Price impact<br />
                  <strong>{(r.totalImpactUsd > 0 ? (r.totalImpactUsd / (Number(r.amountIn) / 1e18 || 1)) * 100 : 0).toFixed(2)}%</strong>
                </div>
                <div>
                  ETA<br />
                  <strong>{fmtEta(r.totalEtaSeconds)}</strong>
                </div>
              </div>
              <div className="steps">
                {r.steps.map((s, j) => (
                  <div className="step" key={j}>
                    <span>{s.tokenIn} → {s.tokenOut}</span>
                    <span className="venue">
                      {s.kind === "bridge" ? "bridge" : "swap"} · {s.venueId}
                      {s.chainFrom !== s.chainTo ? ` · chain ${s.chainFrom} → ${s.chainTo}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="footer-note">Price source: {quote.priceSource}</p>
        </>
      )}
    </main>
  );
}
