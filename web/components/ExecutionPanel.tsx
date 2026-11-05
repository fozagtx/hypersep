"use client";

import { useRef, useState } from "react";
import type { Address, Hex } from "viem";
import { explorerTxUrl } from "@/lib/chains";
import { buildActions, sendWalletTx, type TxAction } from "@/lib/execution";
import type { ApiRoute, DeploymentMap } from "@/lib/types";

type ActionStatus = "pending" | "signing" | "confirming" | "confirmed" | "error";

interface ActionState {
  status: ActionStatus;
  txHash?: string;
  error?: string;
}

interface Props {
  route: ApiRoute;
  deployments: DeploymentMap;
  userAddress: Address;
}

const STATUS_LABEL: Record<ActionStatus, string> = {
  pending: "Queued",
  signing: "Awaiting signature",
  confirming: "Confirming",
  confirmed: "Confirmed",
  error: "Failed",
};

const STATUS_CLASS: Record<ActionStatus, string> = {
  pending: "status-idle",
  signing: "status-active",
  confirming: "status-active",
  confirmed: "status-confirmed",
  error: "status-error",
};

export function ExecutionPanel({ route, deployments, userAddress }: Props) {
  const [states, setStates] = useState<Record<string, ActionState>>({});
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const txHashes = useRef<Record<string, string>>({});

  let actions: TxAction[];
  try {
    actions = buildActions(route, deployments, userAddress);
  } catch (e) {
    return <p className="warning">⚠ {e instanceof Error ? e.message : "Cannot build execution plan"}</p>;
  }

  const setState = (id: string, next: Partial<ActionState>) =>
    setStates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { status: "pending" }), ...next } }));

  async function runAll() {
    setRunning(true);
    setFinished(false);
    try {
      for (const action of actions) {
        setState(action.id, { status: "signing", error: undefined });

        if (action.type === "bridge-release") {
          // Relayer executes this step server-side after verifying the deposit.
          setState(action.id, { status: "confirming" });
          const depositHash = txHashes.current[action.relay!.depositActionId];
          const res = await fetch("/api/bridge/relay", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              depositTxHash: depositHash,
              srcChainId: action.relay!.srcChainId,
              destChainId: action.relay!.destChainId,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Relay failed");
          txHashes.current[action.id] = data.releaseTxHash;
          setState(action.id, { status: "confirmed", txHash: data.releaseTxHash });
          continue;
        }

        const hash = await sendWalletTx(action, action.chainId, userAddress);
        txHashes.current[action.id] = hash;
        setState(action.id, { status: "confirmed", txHash: hash });
      }
      setFinished(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Execution failed";
      setStates((prev) => {
        const next = { ...prev };
        for (const a of actions) {
          if (next[a.id]?.status !== "confirmed") {
            next[a.id] = { status: "error", error: msg };
            break;
          }
        }
        return next;
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Execute route</h2>
        <span className="tag">{actions.length} on-chain transactions</span>
      </div>

      <div className="timeline">
        {actions.map((action, i) => {
          const s = states[action.id] ?? { status: "pending" as ActionStatus };
          const cls =
            s.status === "confirmed" ? "confirmed" : s.status === "error" ? "error" : s.status === "pending" ? "" : "active";
          return (
            <div className={`tl-item ${cls}`} key={action.id}>
              <div className="tl-dot" />
              <div className="tl-body">
                <div className="tl-title">
                  <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
                  {action.label}
                </div>
                <div className="tl-meta">
                  {action.type === "bridge-release" && <span>relayer-executed</span>}
                  <span className={STATUS_CLASS[s.status]}>{STATUS_LABEL[s.status]}</span>
                  {s.txHash && (
                    <a href={explorerTxUrl(action.chainId, s.txHash)} target="_blank" rel="noreferrer">
                      {s.txHash.slice(0, 10)}… ↗
                    </a>
                  )}
                </div>
                {s.error && <div className="tl-error">⚠ {s.error}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="btn-row">
        <button className="btn btn-green" onClick={runAll} disabled={running}>
          {running ? "Executing…" : finished ? "Execute again" : "Execute route"}
        </button>
      </div>

      {finished && (
        <p className="footer-note" style={{ color: "var(--success)" }}>
          ✓ Route executed. All transaction hashes are listed above and recorded on-chain.
        </p>
      )}
    </div>
  );
}
