import type { Metadata } from "next";
import { loadDeployments } from "@/lib/engine/registry";

export const metadata: Metadata = {
  title: "Contract details - Hypersep",
  description: "Portaldot V3 testnet contracts, deployer addresses, and deployment status.",
};

const REPO = "https://github.com/fozagtx/hypersep";
const DEPLOYER_EVM = "0x421D297A9d9ba5112Ede43E96F83a54C4e4AafDb";
const DEPLOYER_NATIVE = "5DZPgRPx9vvXf2FuSsm3WzVXBwhQkTSaCnP3yWT7s2inqpyr";

const PLANNED = [
  ["TestERC20 (mUSDC)", "Mock USD Coin, 18 decimals, open mint faucet"],
  ["TestERC20 (mPOT)", "Mock POT, 18 decimals, open mint faucet"],
  ["Factory", "Fee-tiered pair registry for venue discovery"],
  ["Router", "addLiquidity, swaps, on-chain quotes"],
  ["Pair 30 bps", "USDC/POT constant-product pool"],
  ["Pair 10 bps", "USDC/POT constant-product pool"],
  ["HypersepBridge", "Lock and release testnet bridge"],
];

export default function ContractsPage() {
  const deployments = loadDeployments();
  const entries = Object.entries(deployments);

  return (
    <main className="agent-docs contracts-page">
      <a href="/" className="agent-docs-back">Back to Hypersep</a>

      <h1>Contract details</h1>
      <p className="agent-docs-lead">
        Portaldot V3 testnet deployment for the MiniAMM venues, tokens, and bridge. Addresses fill
        in automatically from <code>lib/engine/deployments.json</code> after the deploy script runs.
      </p>

      <div className="contract-table">
        <div className="contract-table-row">
          <span>Network</span><strong>Portaldot V3 Testnet</strong>
        </div>
        <div className="contract-table-row">
          <span>Chain ID</span><strong>420420777</strong>
        </div>
        <div className="contract-table-row">
          <span>EVM RPC</span><code>https://test-evm-rpc-v3.portaldot.dev</code>
        </div>
        <div className="contract-table-row">
          <span>Node RPC</span><code>wss://test-node-v3.portaldot.dev</code>
        </div>
        <div className="contract-table-row">
          <span>Explorer</span><a href="https://node-console.portaldot.dev/" target="_blank" rel="noreferrer">node-console.portaldot.dev</a>
        </div>
        <div className="contract-table-row">
          <span>Deployer EVM</span><code>{DEPLOYER_EVM}</code>
        </div>
        <div className="contract-table-row">
          <span>Deployer native</span><code>{DEPLOYER_NATIVE}</code>
        </div>
        <div className="contract-table-row">
          <span>Status</span>
          <strong className={entries.length ? "status-confirmed" : "status-idle"}>
            {entries.length ? "Deployed" : "Not deployed yet"}
          </strong>
        </div>
      </div>

      {entries.length > 0 ? (
        entries.map(([chainId, dep]) => (
          <section key={chainId} className="contract-chain">
            <div className="contract-chain-head">
              <span>Chain {chainId}</span>
              <span>{dep.network} · {dep.deployedAt}</span>
            </div>
            <div className="contract-grid">
              {[
                ["Factory", dep.factory],
                ["Router", dep.router],
                ["Bridge", dep.bridge],
                ["Relayer", dep.relayer],
                ...Object.entries(dep.tokens).map(([s, a]) => [`Token ${s}`, a]),
                ...Object.entries(dep.pairs).map(([k, a]) => [k, a]),
                ...Object.entries(dep.txHashes).map(([k, h]) => [`tx ${k}`, h]),
              ].map(([label, value]) => (
                <div className="contract-card" key={`${chainId}-${label}`}>
                  <div className="k">{label}</div>
                  <code>{value}</code>
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <>
          <p className="contract-note">
            Not deployed yet. The deployer needs roughly 200 tPOT on Portaldot for the first
            contract&apos;s gas and storage deposit hold. Send tPOT to the native deployer address, then
            run the script.
          </p>
          <div className="contract-grid">
            {PLANNED.map(([name, desc]) => (
              <div className="contract-card" key={name}>
                <div className="k">{name}</div>
                <code>Not deployed</code>
                <p className="contract-desc">{desc}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Repository</h2>
      <div className="agent-tools">
        <div>
          <a href={`${REPO}/tree/main/contracts`} target="_blank" rel="noreferrer">
            <code>contracts/</code>
          </a>
          <span>Solidity sources, tests, and the deploy script.</span>
        </div>
        <div>
          <a href={`${REPO}/blob/main/contracts/scripts/deploy.ts`} target="_blank" rel="noreferrer">
            <code>contracts/scripts/deploy.ts</code>
          </a>
          <span>Deploys tokens, Factory, Router, both pools, and the bridge.</span>
        </div>
        <div>
          <a href={REPO} target="_blank" rel="noreferrer">
            <code>{REPO.replace("https://", "")}</code>
          </a>
          <span>Public repository.</span>
        </div>
      </div>
    </main>
  );
}
