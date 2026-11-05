"use client";

import type { ApiRoute } from "@/lib/types";

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

const CHAIN_SHORT: Record<number, { name: string; color: string }> = {
  11155111: { name: "Sepolia", color: "var(--chain-a)" },
  420420777: { name: "Portaldot", color: "var(--chain-b)" },
};

function chainInfo(id: number) {
  return CHAIN_SHORT[id] ?? { name: `Chain ${id}`, color: "var(--faint)" };
}

/** The signature visual: the aggregated route as a chain of nodes and hops. */
function RoutePath({ route }: { route: ApiRoute }) {
  const nodes: React.ReactNode[] = [];

  route.steps.forEach((step, i) => {
    if (i === 0) {
      const from = chainInfo(step.chainFrom);
      nodes.push(
        <div className="path-node" key={`from`}>
          <span className="chain-dot" style={{ background: from.color }} />
          <span>
            <span className="chain-name">{from.name}</span>
            <br />
            <span className="token-name">{step.tokenIn}</span>
          </span>
        </div>
      );
    }

    const isBridge = step.kind === "bridge";
    const feeMatch = step.venueId.match(/-(\d+)bps$/);
    const label = isBridge ? "bridge" : `swap · ${feeMatch ? feeMatch[1] : "30"} bps`;
    const to = chainInfo(step.chainTo);

    nodes.push(
      <div className={`path-link${isBridge ? " bridge" : ""}`} key={`link-${i}`}>
        <span className="link-label">{label}</span>
      </div>
    );

    nodes.push(
      <div className="path-node" key={`node-${i}`}>
        <span className="chain-dot" style={{ background: to.color }} />
        <span>
          <span className="chain-name">{to.name}</span>
          <br />
          <span className="token-name">{step.tokenOut}</span>
        </span>
      </div>
    );
  });

  return <div className="route-path">{nodes}</div>;
}

interface Props {
  route: ApiRoute;
  toToken: string;
  selected: boolean;
  onSelect: () => void;
}

export function RouteCard({ route: r, toToken, selected, onSelect }: Props) {
  return (
    <div className={`route-card${selected ? " selected" : ""}`}>
      <div className="route-top">
        <div>
          <div className="route-pills">
            {r.labels.map((l) => (
              <span key={l} className={`pill${l === "Best overall" ? " best" : ""}`}>
                {l}
              </span>
            ))}
          </div>
          <h2>Route via {r.steps.length === 1 ? "single venue" : `${r.steps.length} hops`}</h2>
        </div>
        <div className="route-receive">
          <div className="cap">You receive</div>
          <div>
            <span className="amount">{fmtAmount(r.amountOut)}</span>
            <span className="token">{toToken}</span>
          </div>
        </div>
      </div>

      <RoutePath route={r} />

      <div className="route-stats">
        <div className="stat">
          <div className="k">Fees</div>
          <div className="v">${r.totalFeeUsd.toFixed(2)}</div>
        </div>
        <div className="stat">
          <div className="k">Gas</div>
          <div className="v">${r.totalGasUsd.toFixed(2)}</div>
        </div>
        <div className="stat">
          <div className="k">Price impact</div>
          <div className="v">{r.priceImpactPct.toFixed(2)}%</div>
        </div>
        <div className="stat">
          <div className="k">ETA</div>
          <div className="v">{fmtEta(r.totalEtaSeconds)}</div>
        </div>
      </div>

      <div className="route-actions">
        <button className={selected ? "btn-ghost" : "btn-primary"} onClick={onSelect} disabled={selected}>
          {selected ? "Selected ✓" : "Execute this route"}
        </button>
      </div>
    </div>
  );
}
