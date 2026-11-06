"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@/hooks/useWallet";
import type { Address } from "viem";
import { ConnectButton } from "@/components/ConnectButton";
import { RouteCard } from "@/components/RouteCard";
import { ExecutionPanel } from "@/components/ExecutionPanel";
import { HypersepMark, PortaldotMark } from "@/components/logos";
import { RevealObserver } from "@/components/Reveal";
import { buildFaucetAction, sendWalletTx } from "@/lib/execution";
import type { ApiQuote, ApiRoute, DeploymentMap } from "@/lib/types";

const HeroDevice = dynamic(() => import("@/components/HeroDevice").then((m) => m.HeroDevice), {
  ssr: false,
  loading: () => <div className="hero-device hero-device--loading" />,
});

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

  const swapRef = useRef<HTMLDivElement | null>(null);
  const wasConnected = useRef(false);

  // On wallet connect, land the user on the swap card instead of leaving them
  // parked on the marketing surface.
  useEffect(() => {
    if (isConnected && !wasConnected.current) {
      wasConnected.current = true;
      swapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (!isConnected) wasConnected.current = false;
  }, [isConnected]);

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
      <RevealObserver />
      <header className="wh" id="top">
        <div className="wh-veil" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <a className="wh-logo" href="/#top" aria-label="Hypersep">
          <HypersepMark size={21} />
          <span>Hypersep</span>
        </a>
        <div className="wh-right">
          <a className="wh-link" href="#swap">Swap</a>
          <a className="wh-link" href="#access">Agents</a>
          <a className="wh-link" href="#highlights">Venues</a>
          <a className="wh-link" href="/docs">API</a>
          <a className="wh-link" href="#faq">FAQs</a>
          <ConnectButton />
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 className="blur-in">
              Every chain,
              <br />
              one best route.
            </h1>
            <p className="sub blur-in d1">
              Hypersep is an AI-first exchange and trade aggregator. Describe the trade, and it
              reads every pool and bridge, prices the whole path, and settles it across Portaldot
              and EVM chains.
            </p>
            <div className="hero-actions blur-in d2">
              <button className="btn btn-green" onClick={getRoutes} disabled={loading}>
                {loading ? "Routing…" : "Find best route"}
              </button>
              <button className="btn btn-outline" onClick={faucet} disabled={!isConnected}>
                Get test tokens
              </button>
            </div>
            {faucetState && <p className="footer-note">{faucetState}</p>}
          </div>

          <HeroDevice />
        </div>
      </section>

      <div className="partners">
        <p>Venues aggregated</p>
        <div className="partners-row">
          <span className="venue">
            <PortaldotMark size={15} />
            <span>Portaldot V3</span>
          </span>
          <span className="venue">Ethereum Sepolia</span>
          <span className="venue">MiniAMM 30 bps</span>
          <span className="venue">MiniAMM 10 bps</span>
          <span className="venue">Hypersep Bridge</span>
        </div>
      </div>

      <section className="wrap" id="swap">
        <div className="swap-card" ref={swapRef}>
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

          <div className="leg">
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

        <div style={{ maxWidth: 600, margin: "0 auto" }}>
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
              {quote.demo && (
                <p className="warning">
                  Demo mode: contracts are not deployed yet, so these routes use seeded liquidity.
                  Run the deploy script to quote and execute against real testnet pools.
                </p>
              )}
            </>
          )}

          {!quote && !error && (
            <div className="empty" style={{ marginTop: 18 }}>
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
      </section>

      <section className="light" id="highlights">
        <div className="light-inner reveal">
          <h2>Routing that reads the whole market, not one pool</h2>
          <div className="bento">
            <div className="cell">
              <div className="big">Top 3</div>
              <p className="small">Routes ranked on every quote. <span className="tick">Best, cheapest, fastest.</span></p>
            </div>
            <div className="cell">
              <div className="big">Guaranteed quote</div>
              <p className="small">Execute at the price you see. Slippage guard at 0.5%.</p>
            </div>
            <div className="cell">
              <div className="big">2 venues</div>
              <p className="small">MiniAMM pools at 30 bps and 10 bps on Portaldot V3 testnet.</p>
            </div>
            <div className="cell">
              <div className="big">Multi-chain</div>
              <p className="small">Sepolia and Portaldot V3 testnet in one route graph.</p>
            </div>
            <div className="cell">
              <div className="big">100ms</div>
              <p className="small"><span className="tick">Quote response.</span> Venues polled in parallel.</p>
            </div>
            <div className="cell">
              <div className="big">99.9%</div>
              <p className="small">Uptime target. Always on, testnet first.</p>
            </div>
            <div className="cell">
              <div className="big">Bridge + swap</div>
              <p className="small">Lock on one chain, release and swap on the next.</p>
            </div>
            <div className="cell">
              <div className="big">Multi-token</div>
              <p className="small">mUSDC and mPOT on both chains today, more next.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features reveal" id="api">          <h2>An aggregator API built for agents</h2>
        <p className="lead">
          Aggregator API. Designed for best execution. Ranked routes with fees, gas, price impact
          and settlement time on every response.
        </p>
        <div className="feat-grid">
          <div className="feat">
            <h3>Speed boosting</h3>
            <p>Venues quote in parallel. Land onchain faster than manual bridging.</p>
          </div>
          <div className="feat">
            <h3>Optimized for price</h3>
            <p>Fees, gas, impact and bridge risk scored together. Perfect when price matters most.</p>
          </div>
          <div className="feat">
            <h3>Flexible fills</h3>
            <p>Request one amount. Compare every path. Your trades, your call.</p>
          </div>
        </div>
      </section>

      <section className="faq reveal" id="faq">
        <h2>FAQs</h2>
        <div className="faq-item">
          <strong>What is Hypersep?</strong>
          <span>A cross-chain aggregator that compares venues across Portaldot V3 and EVM chains and executes the best route.</span>
        </div>
        <div className="faq-item">
          <strong>What assets can I trade?</strong>
          <span>mUSDC and mPOT on Sepolia and Portaldot V3 testnet today. We deploy new venues as liquidity grows.</span>
        </div>
        <div className="faq-item">
          <strong>How is Hypersep different?</strong>
          <span>It ranks complete routes, not single pools. Bridge cost, swap fees, slippage and ETA are compared before you sign.</span>
        </div>
      </section>

      <footer className="footer">
        <span>Hypersep - Cross-chain liquidity aggregator - Testnet prototype</span>
        <span>
          <a href="#swap">Swap</a> · <a href="#highlights">Venues</a> · <a href="#api">API</a> · <a href="#faq">FAQs</a>
        </span>
      </footer>
    </>
  );
}
