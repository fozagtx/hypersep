import { NextRequest, NextResponse } from "next/server";
import { findToken, loadDeployments } from "@/lib/engine/registry";
import { getTopRoutes } from "@/lib/engine/quote";

export const dynamic = "force-dynamic";

const CHAINS = new Set(["420420777", "11155111"]);

const SERVER_INFO = {
  name: "hypersep",
  version: "0.1.0",
};

const TOOLS = [
  {
    name: "hypersep_quote",
    description:
      "Get ranked swap routes between tokens/chains with cost breakdown (fees, gas, price impact, ETA).",
    inputSchema: {
      type: "object",
      properties: {
        fromChain: { type: "string", description: "Source chain id (11155111 or 420420777)" },
        fromToken: { type: "string", description: "Source token symbol (mUSDC, mPOT)" },
        toChain: { type: "string", description: "Destination chain id" },
        toToken: { type: "string", description: "Destination token symbol" },
        amountIn: { type: "number", description: "Amount in human units" },
      },
      required: ["fromChain", "fromToken", "toChain", "toToken", "amountIn"],
    },
  },
  {
    name: "hypersep_deployments",
    description: "List deployed contract addresses from deployments.json.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "hypersep_status",
    description: "Report whether the quote engine and deployments are available.",
    inputSchema: { type: "object", properties: {} },
  },
];

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: any;
};

function rpcResult(id: any, result: any) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id: any, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

async function callTool(name: string, args: any) {
  switch (name) {
    case "hypersep_quote": {
      const fromChain = String(args?.fromChain ?? "");
      const toChain = String(args?.toChain ?? "");
      if (!CHAINS.has(fromChain) || !CHAINS.has(toChain)) {
        return { content: [{ type: "text", text: "Unsupported chain. Use 11155111 or 420420777." }], isError: true };
      }
      const tokenIn = findToken(String(args?.fromToken ?? ""), Number(fromChain));
      const tokenOut = findToken(String(args?.toToken ?? ""), Number(toChain));
      if (!tokenIn || !tokenOut) {
        return { content: [{ type: "text", text: "Unknown token. Run deploy first." }], isError: true };
      }
      const asNumber = Number(args?.amountIn);
      if (!Number.isFinite(asNumber) || asNumber <= 0) {
        return { content: [{ type: "text", text: "amountIn must be a positive number." }], isError: true };
      }
      const amountIn = BigInt(Math.floor(asNumber * 10 ** tokenIn.decimals));
      const result = await getTopRoutes({ tokenIn, tokenOut, amountIn });
      const text = JSON.stringify(
        {
          input: { token: tokenIn.symbol, chainId: tokenIn.chainId, amountIn: amountIn.toString() },
          output: { token: tokenOut.symbol, chainId: tokenOut.chainId },
          routes: result.routes.map((r) => ({
            labels: r.labels,
            amountOut: r.amountOut.toString(),
            totalFeeUsd: r.totalFeeUsd,
            totalGasUsd: r.totalGasUsd,
            totalEtaSeconds: r.totalEtaSeconds,
            score: r.score,
          })),
          warnings: result.warnings,
          demo: result.demo,
        },
        null,
        2
      );
      return { content: [{ type: "text", text }] };
    }
    case "hypersep_deployments": {
      return { content: [{ type: "text", text: JSON.stringify(loadDeployments(), null, 2) }] };
    }
    case "hypersep_status": {
      const deps = loadDeployments();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true, deploymentsLoaded: Object.keys(deps).length }, null, 2),
          },
        ],
      };
    }
    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
}

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  const { id, method, params } = body ?? {};

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments ?? {};
      if (!name) return rpcError(id, -32602, "Missing tool name");
      const result = await callTool(name, args);
      return rpcResult(id, result);
    }
    case "ping":
      return rpcResult(id, {});
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function GET() {
  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    mcp: "POST /api/mcp with JSON-RPC 2.0",
    tools: TOOLS.map((t) => t.name),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization",
    },
  });
}
