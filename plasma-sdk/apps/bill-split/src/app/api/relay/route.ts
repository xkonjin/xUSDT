/**
 * Plasma Relay API Route
 *
 * Executes signed EIP-3009 authorizations on Plasma chain.
 * 
 * Uses RELAYER wallet to pay gas (no gasless API secret needed).
 * If PLASMA_RELAYER_SECRET is available, will try gasless API first.
 */

import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { USDT0_ADDRESS, PLASMA_MAINNET_RPC, plasmaMainnet } from "@plasma-pay/core";

const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;

const TRANSFER_WITH_AUTH_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "transferWithAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export async function POST(request: Request) {
  try {
    if (!RELAYER_KEY) {
      return NextResponse.json(
        { error: "Relayer not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { from, to, value, validAfter, validBefore, nonce, v, r, s } = body;

    if (!from || !to || !value || !nonce || v === undefined || !r || !s) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < validAfter || now > validBefore) {
      return NextResponse.json(
        { error: "Authorization expired or not yet valid" },
        { status: 400 }
      );
    }

    const account = privateKeyToAccount(RELAYER_KEY);

    const walletClient = createWalletClient({
      account,
      chain: plasmaMainnet,
      transport: http(PLASMA_MAINNET_RPC),
    });

    const publicClient = createPublicClient({
      chain: plasmaMainnet,
      transport: http(PLASMA_MAINNET_RPC),
    });

    const txHash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: "transferWithAuthorization",
      args: [
        from as Address,
        to as Address,
        BigInt(value),
        BigInt(validAfter),
        BigInt(validBefore),
        nonce as Hex,
        v,
        r as Hex,
        s as Hex,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 30000,
    });

    if (receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction reverted" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
    });
  } catch (error) {
    console.error("Relay error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Relay failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}
