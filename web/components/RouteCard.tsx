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

interface Props {
  route: ApiRoute;
  toToken: string;
  selected: boolean;
  onSelect: () => void;
}

export function RouteCard({ route: r, toToken, selected, onSelect }: Props) {
  return (
    <div className="card route-card" style={selected ? { borderColor: "var(--accent)" } : undefined}>
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
          <strong>{r.priceImpactPct.toFixed(2)}%</strong>
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
      <div style={{ marginTop: 14 }}>
        <button onClick={onSelect} disabled={selected}>
          {selected ? "Selected" : "Execute this route"}
        </button>
      </div>
    </div>
  );
}
