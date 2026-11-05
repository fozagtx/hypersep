import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aggregator API - Hypersep",
  description: "Quote routes across Portaldot V3 and EVM chains.",
};

const EXAMPLE = `{
  "routes": [
    {
      "labels": ["Best overall"],
      "amountOut": "...,...",
      "totalFeeUsd": 0.30,
      "totalGasUsd": 0.05,
      "totalEtaSeconds": 6,
      "steps": [
        {
          "venueId": "miniamm-420420777-30bps",
          "kind": "amm",
          "tokenIn": "mUSDC",
          "tokenOut": "mPOT"
        }
      ]
    }
  ]
}`;

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 28px 96px" }}>
      <a href="/" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>
        ← Back to Hypersep
      </a>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px,5vw,52px)", letterSpacing: "-0.03em", margin: "20px 0 10px" }}>
        Aggregator API
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 560, marginBottom: 36 }}>
        One GET request returns ranked routes across every venue and bridge path. Live on the
        testnet deploy. No API key required.
      </p>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>GET /api/quote</h2>
      <pre
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          overflowX: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        {`GET /api/quote
  ?fromChain=11155111
  &fromToken=mUSDC
  &toChain=420420777
  &toToken=mPOT
  &amountIn=100`}
      </pre>

      <h2 style={{ fontSize: 16, margin: "28px 0 10px" }}>Response</h2>
      <pre
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          overflowX: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        {EXAMPLE}
      </pre>

      <h2 style={{ fontSize: 16, margin: "28px 0 10px" }}>Try it now</h2>
      <pre
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          overflowX: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        {`curl "http://localhost:3000/api/quote?fromChain=11155111&fromToken=mUSDC&toChain=420420777&toToken=mPOT&amountIn=100"`}
      </pre>
      <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 12 }}>
        Before the testnet deploy, this returns a clear error: run the deploy script first. After
        deploy, it returns live ranked routes from on-chain reserves.
      </p>

      <h2 style={{ fontSize: 16, margin: "28px 0 10px" }}>Other endpoints</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {[
          ["GET /api/deployments", "Contract addresses and tx hashes."],
          ["GET /api/status?chainId&txHash", "Settlement status for a transaction."],
          ["POST /api/bridge/relay", "Relayer releases bridged funds on the destination chain."],
        ].map(([path, desc]) => (
          <div
            key={path}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{path}</code>
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
