import { NextRequest, NextResponse } from "next/server";
import { findToken } from "@/lib/engine/registry";
import { getTopRoutes } from "@/lib/engine/quote";

export const dynamic = "force-dynamic";

const CHAINS = new Set(["420420777", "11155111"]);

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "access-control-allow-origin": "*" },
  });
}

/** GET /api/quote?fromChain=11155111&fromToken=mUSDC&toChain=420420777&toToken=mPOT&amountIn=100 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const fromChain = params.get("fromChain");
  const fromTokenSymbol = params.get("fromToken");
  const toChain = params.get("toChain");
  const toTokenSymbol = params.get("toToken");
  const amountInRaw = params.get("amountIn");

  if (!fromChain || !toChain || !fromTokenSymbol || !toTokenSymbol || !amountInRaw) {
    return json(
      { error: "Required: fromChain, fromToken, toChain, toToken, amountIn" },
      400
    );
  }
  if (!CHAINS.has(fromChain) || !CHAINS.has(toChain)) {
    return json({ error: "Unsupported chain. Use 420420777 (Portaldot) or 11155111 (Sepolia)." }, 400);
  }

  const tokenIn = findToken(fromTokenSymbol, Number(fromChain));
  const tokenOut = findToken(toTokenSymbol, Number(toChain));
  if (!tokenIn || !tokenOut) {
    return json(
      { error: `Unknown token. Available tokens come from deployments.json (run deploy first).` },
      400
    );
  }

  let amountIn: bigint;
  try {
    const asNumber = Number(amountInRaw);
    if (!Number.isFinite(asNumber) || asNumber <= 0) throw new Error("bad amount");
    amountIn = BigInt(Math.floor(asNumber * 10 ** tokenIn.decimals));
  } catch {
    return json({ error: "amountIn must be a positive number" }, 400);
  }

  const result = await getTopRoutes({ tokenIn, tokenOut, amountIn });

  return json({
    input: {
      token: tokenIn.symbol,
      chainId: tokenIn.chainId,
      amountIn: amountIn.toString(),
    },
    output: { token: tokenOut.symbol, chainId: tokenOut.chainId },
    routes: result.routes.map((r) => ({
      labels: r.labels,
      amountIn: r.amountIn.toString(),
      amountOut: r.amountOut.toString(),
      totalFeeUsd: r.totalFeeUsd,
      totalGasUsd: r.totalGasUsd,
      totalImpactUsd: r.totalImpactUsd,
      priceImpactPct:
        (r.totalImpactUsd / ((Number(r.amountIn) / 10 ** tokenIn.decimals) * tokenIn.priceUsd || 1)) * 100,
      totalEtaSeconds: r.totalEtaSeconds,
      score: r.score,
      steps: r.steps.map((s) => ({
        venueId: s.venueId,
        kind: s.kind,
        chainFrom: s.chainFrom,
        chainTo: s.chainTo,
        tokenIn: s.tokenIn.symbol,
        tokenOut: s.tokenOut.symbol,
        amountIn: s.amountIn.toString(),
        amountOut: s.amountOut.toString(),
        feeUsd: s.feeUsd,
        gasUsd: s.gasUsd,
        priceImpactBps: s.priceImpactBps,
        etaSeconds: s.etaSeconds,
      })),
    })),
    warnings: result.warnings,
    priceSource: result.priceSource,
  });
}
