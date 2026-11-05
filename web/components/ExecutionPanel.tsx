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
  signing: "Waiting for signature…",
  confirming: "Confirming…",
  confirmed: "Confirmed",
  error: "Failed",
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
      // mark the first non-confirmed action as failed
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
    <div className="card">
      <h2>Execute route</h2>
      <p className="subtitle" style={{ margin: "0 0 14px" }}>
        {actions.length} on-chain transactions. Your wallet will ask you to sign each one and switch
        networks when the route crosses chains.
      </p>

      {actions.map((action, i) => {
        const s = states[action.id] ?? { status: "pending" as ActionStatus };
        return (
          <div className="step" key={action.id} style={{ justifyContent: "space-between", padding: "8px 0" }}>
            <span>
              <strong>{i + 1}.</strong> {action.label}
              {action.type === "bridge-release" && (
                <span className="venue" style={{ marginLeft: 8 }}>relayer-executed</span>
              )}
            </span>
            <span
              style={{
                fontSize: 12,
                color:
                  s.status === "confirmed"
                    ? "var(--accent-2)"
                    : s.status === "error"
                      ? "#ef4444"
                      : "var(--muted)",
              }}
            >
              {STATUS_LABEL[s.status]}
              {s.txHash && (
                <a
                  href={explorerTxUrl(action.chainId, s.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginLeft: 8, color: "var(--accent)" }}
                >
                  {s.txHash.slice(0, 10)}…
                </a>
              )}
            </span>
            {s.error && <p className="warning" style={{ width: "100%" }}>⚠ {s.error}</p>}
          </div>
        );
      })}

      <div style={{ marginTop: 16 }}>
        <button onClick={runAll} disabled={running}>
          {running ? "Executing…" : finished ? "Execute again" : "Execute route"}
        </button>
      </div>

      {finished && (
        <p style={{ color: "var(--accent-2)", marginTop: 12, fontSize: 14 }}>
          ✓ Route executed. All transaction hashes are listed above and recorded on-chain.
        </p>
      )}
    </div>
  );
}
