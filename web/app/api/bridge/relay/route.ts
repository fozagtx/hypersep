import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  isHash,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { BRIDGE_ABI } from "@/lib/abis";
import { CHAINS, loadDeployments } from "@/lib/engine/registry";

export const dynamic = "force-dynamic";

/**
 * POST /api/bridge/relay
 * Body: { depositTxHash, srcChainId, destChainId }
 *
 * The testnet relayer: verifies the Deposited event on the source chain, then
 * releases the same amount to the same recipient on the destination chain.
 * Requires RELAYER_PRIVATE_KEY (server-side only) matching the bridge's
 * configured relayer address.
 */
export async function POST(req: NextRequest) {
  let body: { depositTxHash?: string; srcChainId?: number; destChainId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { depositTxHash, srcChainId, destChainId } = body;
  if (!depositTxHash || !isHash(depositTxHash) || !srcChainId || !destChainId) {
    return NextResponse.json(
      { error: "Required: depositTxHash (0x…), srcChainId, destChainId" },
      { status: 400 }
    );
  }

  const deployments = loadDeployments();
  const srcDep = deployments[String(srcChainId)];
  const destDep = deployments[String(destChainId)];
  const srcChain = CHAINS[srcChainId];
  const destChain = CHAINS[destChainId];
  if (!srcDep || !destDep || !srcChain || !destChain) {
    return NextResponse.json({ error: "Chain not deployed or unsupported" }, { status: 400 });
  }

  const relayerKey = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
  if (!relayerKey) {
    return NextResponse.json(
      { error: "Relayer not configured - set RELAYER_PRIVATE_KEY in web/.env.local" },
      { status: 503 }
    );
  }

  try {
    // 1. Verify the deposit on the source chain
    const srcClient = createPublicClient({ transport: http(srcChain.rpcUrl) });
    const receipt = await srcClient.getTransactionReceipt({ hash: depositTxHash as Hex });
    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Deposit transaction failed on source chain" }, { status: 400 });
    }

    const bridgeAddress = srcDep.bridge.toLowerCase();
    const depositLog = receipt.logs.find((l) => l.address.toLowerCase() === bridgeAddress);
    if (!depositLog) {
      return NextResponse.json({ error: "No HypersepBridge deposit found in transaction" }, { status: 400 });
    }

    const decoded = decodeEventLog({
      abi: BRIDGE_ABI,
      data: depositLog.data,
      topics: depositLog.topics,
    });
    if (decoded.eventName !== "Deposited") {
      return NextResponse.json({ error: "Event is not a Deposited log" }, { status: 400 });
    }
    const { depositId, token, amount, recipient } = decoded.args as unknown as {
      depositId: Hex;
      token: Address;
      amount: bigint;
      recipient: Address;
    };

    // 2. Guard against double release on the destination chain
    const destClient = createPublicClient({ transport: http(destChain.rpcUrl) });
    const alreadyReleased = await destClient.readContract({
      address: destDep.bridge as Address,
      abi: BRIDGE_ABI,
      functionName: "released",
      args: [depositId],
    });
    if (alreadyReleased) {
      return NextResponse.json({ error: "Deposit already released on destination chain" }, { status: 409 });
    }

    // 3. Release on the destination chain
    const account = privateKeyToAccount(relayerKey);
    const wallet = createWalletClient({
      account,
      chain: { ...destChain, id: destChainId } as any,
      transport: http(destChain.rpcUrl),
    });

    const releaseHash = await wallet.writeContract({
      address: destDep.bridge as Address,
      abi: BRIDGE_ABI,
      functionName: "release",
      args: [depositId, token, amount, recipient],
      account,
      chain: null,
    });
    const releaseReceipt = await destClient.waitForTransactionReceipt({ hash: releaseHash });

    return NextResponse.json({
      status: releaseReceipt.status === "success" ? "released" : "failed",
      depositId,
      releaseTxHash: releaseHash,
      destChainId,
      recipient,
      amount: amount.toString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Relay failed" },
      { status: 500 }
    );
  }
}
