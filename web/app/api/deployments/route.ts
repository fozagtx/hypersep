import { NextResponse } from "next/server";
import { loadDeployments } from "@/lib/engine/registry";

export const dynamic = "force-dynamic";

/** GET /api/deployments - public contract addresses from deployments.json */
export async function GET() {
  return NextResponse.json(
    { deployments: loadDeployments() },
    { headers: { "access-control-allow-origin": "*" } }
  );
}
