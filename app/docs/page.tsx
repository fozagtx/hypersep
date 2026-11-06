import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aggregator API - Hypersep",
  description: "Quote ranked routes across Portaldot V3 and EVM chains.",
};

const EXAMPLE = `{
  "routes": [
    {
      "labels": ["Best overall", "Fastest"],
      "amountOut": "1234500000000000000000",
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
  ],
  "warnings": [],
  "priceSource": "mock testnet oracle (static prices), labeled in UI",
  "demo": false
}`;

const monospace = {
  background: "var(--panel)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  overflowX: "auto" as const,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
};

export default function DocsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 28px 96px" }}>
      <a href="/" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>
        Back to Hypersep
      </a>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(32px,5vw,52px)",
          letterSpacing: "-0.03em",
          margin: "20px 0 10px",
        }}
      >
        Aggregator API
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 560, marginBottom: 36 }}>
        One GET request returns ranked routes across every venue and bridge path. No API key
        required.
      </p>

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>GET /api/quote</h2>
      <pre style={monospace}>
        {`GET /api/quote
  ?fromChain=11155111
  &fromToken=mUSDC
  &toChain=420420777
  &toToken=mPOT
  &amountIn=100`}
      </pre>

      <h2 style={{ fontSize: 16, margin: "28px 0 10px" }}>Response</h2>
      <pre style={monospace}>{EXAMPLE}</pre>

      <h2 style={{ fontSize: 16, margin: "28px 0 10px" }}>Try it now</h2>
      <pre style={monospace}>
        {`curl "http://localhost:3000/api/quote?fromChain=11155111&fromToken=mUSDC&toChain=420420777&toToken=mPOT&amountIn=100"`}
      </pre>
      <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 12 }}>
        With an empty deployments.json the endpoint returns seeded demo liquidity and sets{" "}
        <code style={{ fontFamily: "var(--font-mono)" }}>demo: true</code>. After you run the deploy
        script and rebuild, it returns live ranked routes from on-chain reserves.
      </p>

      <h2 style={{ fontSize: 16, margin: "28px 0 10px" }}>MCP</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
        The same engine is exposed as an embedded MCP server for agents.
      </p>
      <pre style={monospace}>
        {`curl -s -X POST http://localhost:3000/api/mcp \\
  -H 'Content-Type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
      </pre>

      <h2 style={{ fontSize: 16, margin: "28px 0 10px" }}>Other endpoints</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {[
          ["GET /api/deployments", "Contract addresses and tx hashes."],
          ["GET /api/status?chainId&txHash", "Settlement status for a transaction."],
          ["POST /api/bridge/relay", "Relayer releases bridged funds on the destination chain."],
          ["GET /api/mcp", "MCP discovery document for the embedded agent server."],
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
