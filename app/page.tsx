"use client";

import dynamic from "next/dynamic";
import { ConnectButton } from "@/components/ConnectButton";
import { HypersepMark, PortaldotMark, EthereumMark, ClaudeMark, OpenAIMark } from "@/components/logos";
import { RevealObserver } from "@/components/Reveal";
import { McpEndpoint } from "@/components/McpEndpoint";

const HeroDevice = dynamic(() => import("@/components/HeroDevice").then((m) => m.HeroDevice), {
  ssr: false,
  loading: () => <div className="hero-device hero-device--loading" />,
});

export default function Home() {
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
          <a className="wh-link" href="/dashboard">Swap</a>
          <a className="wh-link" href="#about">About</a>
          <a className="wh-link" href="#faq">FAQs</a>
          <ConnectButton />
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 className="blur-in">
              Two chains.
              <br />
              One ranked route.
            </h1>
            <p className="sub blur-in d1">
              Hypersep compares MiniAMM pools on Portaldot V3 and Sepolia plus bridge paths. You see
              fees, gas, price impact and ETA for the whole route before you sign.
            </p>
            <div className="hero-actions blur-in d2">
              <a className="btn btn-green" href="/dashboard">
                Launch dashboard
              </a>
              <a className="btn btn-outline" href="/docs">
                Read the docs
              </a>
            </div>
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
          <span className="venue">
            <EthereumMark size={13} />
            <span>Ethereum Sepolia</span>
          </span>
          <span className="venue">MiniAMM 30 bps</span>
          <span className="venue">MiniAMM 10 bps</span>
          <span className="venue">Hypersep Bridge</span>
        </div>
      </div>

      <section className="about-section reveal" id="about">
        <div className="light-inner">
          <h2>About Hypersep</h2>
          <p className="lead">
            Hypersep is a testnet prototype for the Portaldot Hacker House. It quotes MiniAMM pools
            at 30 and 10 bps on Portaldot V3 and Sepolia, plus a simulated bridge, and ranks the
            whole path by output, fees, gas, price impact, ETA and bridge risk.
          </p>

          <div className="agents-strip">
            <div className="agent-logos">
              <span><ClaudeMark size={18} /> Claude Code</span>
              <span><OpenAIMark size={18} /> ChatGPT</span>
              <span>Codex</span>
              <span>Cursor</span>
            </div>
            <McpEndpoint />
            <a className="btn btn-outline btn-sm" href="/docs">Agent setup</a>
          </div>
        </div>
      </section>

      <section className="light" id="highlights">
        <div className="light-inner reveal">
          <h2>How the router scores a path</h2>
          <div className="bento">
            <div className="cell cell-flow">
              <div className="flow">
                <svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
                  <path className="flow-line" d="M200 150 C 150 150 120 100 55 74" />
                  <path className="flow-line" d="M200 150 C 250 150 280 100 345 74" />
                  <path className="flow-line" d="M200 150 C 150 150 120 200 55 226" />
                  <path className="flow-line" d="M200 150 C 250 150 280 200 345 226" />
                  <path className="flow-line" d="M200 150 L 200 34" />
                  <path className="flow-line" d="M200 150 L 200 266" />
                  <path className="flow-hot" d="M200 150 C 150 150 120 100 55 74" />
                  <path className="flow-hot" d="M200 150 C 250 150 280 200 345 226" />
                </svg>

                <div className="flow-center">
                  <span className="orb"><HypersepMark size={28} /></span>
                  <em>Hypersep</em>
                </div>

                <div className="flow-node" style={{ left: "4%", top: "12%" }}>
                  <span className="orb"><PortaldotMark size={18} /></span>
                  <em>Portaldot</em>
                </div>
                <div className="flow-node" style={{ right: "4%", top: "12%" }}>
                  <span className="orb"><EthereumMark size={18} /></span>
                  <em>Sepolia</em>
                </div>
                <div className="flow-node" style={{ left: "4%", bottom: "12%" }}>
                  <span className="orb"><ClaudeMark size={16} /></span>
                  <em>Claude</em>
                </div>
                <div className="flow-node" style={{ right: "4%", bottom: "12%" }}>
                  <span className="orb"><OpenAIMark size={16} /></span>
                  <em>ChatGPT</em>
                </div>
                <div className="flow-node" style={{ left: "50%", top: "0%", transform: "translateX(-50%)" }}>
                  <span className="orb flow-mono">30</span>
                  <em>bps pool</em>
                </div>
                <div className="flow-node" style={{ left: "50%", bottom: "0%", transform: "translateX(-50%)" }}>
                  <span className="orb flow-mono">10</span>
                  <em>bps pool</em>
                </div>
              </div>
            </div>

            <div className="cell">
              <div className="big">Top 3</div>
              <p className="small">Routes ranked on every quote. <span className="tick">Best output, cheapest, fastest.</span></p>
            </div>
            <div className="cell">
              <div className="big">On-chain quote</div>
              <p className="small">Quotes read pool reserves from the chain, not a cached price.</p>
            </div>
            <div className="cell">
              <div className="big">2 venues</div>
              <p className="small">MiniAMM pools at 30 bps and 10 bps on Portaldot V3 testnet.</p>
            </div>
            <div className="cell">
              <div className="big">Two chains</div>
              <p className="small">Sepolia and Portaldot V3 testnet in one route graph.</p>
            </div>
            <div className="cell">
              <div className="big">Parallel quotes</div>
              <p className="small">Every venue is queried at once, then the engine ranks the full path.</p>
            </div>
            <div className="cell">
              <div className="big">Testnet first</div>
              <p className="small">Built and tested on Portaldot V3 testnet, chainId 420420777.</p>
            </div>
            <div className="cell">
              <div className="big">Bridge + swap</div>
              <p className="small">A simulated bridge plus a swap on the destination chain.</p>
            </div>
            <div className="cell">
              <div className="big">Two tokens</div>
              <p className="small">mUSDC and mPOT on both chains today.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features reveal" id="api">
        <h2>The same engine over HTTP and MCP</h2>
        <p className="lead">
          `GET /api/quote` returns the ranked routes. `POST /api/mcp` exposes the same tools to
          Claude, ChatGPT, or any MCP client. No API key for reads.
        </p>
        <div className="feat-grid">
          <div className="feat">
            <h3>Parallel venue quotes</h3>
            <p>Each AMM pool and bridge adapter is queried at once, then the engine ranks full paths.</p>
          </div>
          <div className="feat">
            <h3>Cost-ranked routes</h3>
            <p>Output, fees, gas, price impact, ETA and bridge risk are scored together, not one at a time.</p>
          </div>
          <div className="feat">
            <h3>One request, every path</h3>
            <p>The engine enumerates routes up to 3 steps with at most one bridge and two swaps.</p>
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
        <div className="faq-item">
          <strong>Are the contracts deployed?</strong>
          <span>Not yet. Until the Portaldot deploy is funded, the app uses seeded demo liquidity and labels it in the quote response.</span>
        </div>
      </section>

      <footer className="footer">
        <span>Hypersep - Cross-chain liquidity aggregator - Testnet prototype</span>
        <span>
          <a href="/dashboard">Swap</a> · <a href="#faq">FAQs</a>
        </span>
      </footer>
    </>
  );
}
