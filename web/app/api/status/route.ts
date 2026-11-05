import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isHash } from "viem";
import { CHAINS } from "@/lib/engine/registry";

export const dynamic = "force-dynamic";

/** GET /api/status?chainId=420420777&txHash=0x... - settlement monitor */
export async function GET(req: NextRequest) {
  const chainId = Number(req.nextUrl.searchParams.get("chainId"));
  const txHash = req.nextUrl.searchParams.get("txHash") ?? "";

  const chain = CHAINS[chainId];
  if (!chain) {
    return NextResponse.json({ error: "Unsupported chainId" }, { status: 400 });
  }
  if (!isHash(txHash)) {
    return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });
  }

  try {
    const client = createPublicClient({ transport: http(chain.rpcUrl) });
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    return NextResponse.json({
      chainId,
      txHash,
      status: receipt.status === "success" ? "confirmed" : "failed",
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
    });
  } catch {
    return NextResponse.json({ chainId, txHash, status: "pending" });
  }
}
