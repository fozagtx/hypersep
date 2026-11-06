import type { Metadata } from "next";
import { ClaudeMark, OpenAIMark } from "@/components/logos";
import { McpEndpoint } from "@/components/McpEndpoint";

export const metadata: Metadata = {
  title: "Connect an agent - Hypersep",
  description: "Add the Hypersep MCP server to Claude, ChatGPT, or any MCP client.",
};

export default function DocsPage() {
  return (
    <main className="agent-docs">
      <a href="/" className="agent-docs-back">Back to Hypersep</a>

      <h1>Connect an agent</h1>
      <p className="agent-docs-lead">
        Hypersep is an MCP server. Copy the endpoint, add it once, and ask for a route.
      </p>

      <McpEndpoint />

      <div className="agent-logos">
        <span><ClaudeMark size={18} /> Claude Code</span>
        <span><OpenAIMark size={18} /> ChatGPT</span>
        <span>Codex</span>
        <span>Cursor</span>
      </div>

      <ol className="agent-steps">
        <li>Copy the MCP endpoint above.</li>
        <li>Add it to your client: <code>claude mcp add --transport http hypersep &lt;url&gt;</code></li>
        <li>Ask: "Cheapest route for 100 mUSDC on Sepolia into mPOT on Portaldot?"</li>
      </ol>

      <h2>Tools</h2>
      <div className="agent-tools">
        <div><code>hypersep_quote</code><span>Ranked routes with fees, gas, impact, and ETA.</span></div>
        <div><code>hypersep_deployments</code><span>Contract addresses from the deployment config.</span></div>
        <div><code>hypersep_status</code><span>Engine and deployment health.</span></div>
      </div>

      <p className="agent-docs-note">Read-only tools. No API key, OAuth, or database required.</p>
    </main>
  );
}
