import type { Metadata } from "next";
import { ConnectButton } from "@/components/ConnectButton";
import { HypersepMark } from "@/components/logos";
import { TradeDashboard } from "@/components/TradeDashboard";

export const metadata: Metadata = {
  title: "Dashboard - Hypersep",
  description: "Quote and execute the best cross-chain route.",
};

export default function DashboardPage() {
  return (
    <>
      <header className="wh" id="top">
        <div className="wh-veil" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <a className="wh-logo" href="/" aria-label="Hypersep">
          <HypersepMark size={21} />
          <span>Hypersep</span>
        </a>
        <div className="wh-right">
          <a className="wh-link" href="/">Home</a>
          <a className="wh-link" href="/docs">Docs</a>
          <ConnectButton />
        </div>
      </header>

      <main className="wrap dashboard-page">
        <TradeDashboard />
      </main>

      <footer className="footer">
        <span>Hypersep - Cross-chain liquidity aggregator - Testnet prototype</span>
        <span>
          <a href="/">Home</a> · <a href="/docs">Docs</a>
        </span>
      </footer>
    </>
  );
}
