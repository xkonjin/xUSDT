import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  parseEther,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

/**
 * Payment API Route
 * Handles payment processing with EIP-3009 authorization
 */

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS;
const USDT0_ADDRESS = process.env.NEXT_PUBLIC_USDT0_ADDRESS as
  | Address
  | undefined;
const PLASMA_RPC = process.env.NEXT_PUBLIC_PLASMA_RPC;
const API_AUTH_SECRET = process.env.API_AUTH_SECRET;

// Define Plasma chain
const plasmaChain = defineChain({
  id: 98866,
  name: "Plasma",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [PLASMA_RPC || "https://rpc.plasma.to"],
    },
  },
});

// EIP-3009 ABI
const EIP3009_ABI = [
  {
    name: "transferWithAuthorization",
    type: "function",
    stateMutability: "nonpayable",
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
    outputs: [],
  },
  {
    name: "receiveWithAuthorization",
    type: "function",
    stateMutability: "nonpayable",
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
    outputs: [],
  },
] as const;

interface PaymentRequest {
  from: string;
  to: string;
  amount: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  signature: {
    v: number;
    r: string;
    s: string;
  };
  method?: "transfer" | "receive";
}

export async function POST(request: NextRequest) {
  try {
    // Verify API authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${API_AUTH_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body: PaymentRequest = await request.json();
    const {
      from,
      to,
      amount,
      validAfter,
      validBefore,
      nonce,
      signature,
      method = "transfer",
    } = body;

    // Validate required fields
    if (!from || !to || !amount || !nonce || !signature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!isAddress(from) || !isAddress(to)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountBN = parseUnits(amount, 6); // USDT has 6 decimals
    if (amountBN <= 0n) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Check if relayer is configured
    if (!RELAYER_PRIVATE_KEY || !PLASMA_RPC || !USDT0_ADDRESS) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 503 }
      );
    }

    // Initialize clients
    const publicClient = createPublicClient({
      chain: plasmaChain,
      transport: http(PLASMA_RPC),
    });

    const account = privateKeyToAccount(RELAYER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: plasmaChain,
      transport: http(PLASMA_RPC),
    });

    // Check relayer balance for gas
    const relayerBalance = await publicClient.getBalance({
      address: account.address,
    });
    const minGasBalance = parseEther("0.001"); // Minimum 0.001 ETH for gas

    if (relayerBalance < minGasBalance) {
      return NextResponse.json(
        { error: "Insufficient relayer gas balance" },
        { status: 503 }
      );
    }

    // Execute the transaction
    const functionName =
      method === "receive"
        ? "receiveWithAuthorization"
        : "transferWithAuthorization";

    const hash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: EIP3009_ABI,
      functionName,
      args: [
        from as Address,
        to as Address,
        amountBN,
        BigInt(validAfter),
        BigInt(validBefore),
        nonce as Hex,
        signature.v,
        signature.r as Hex,
        signature.s as Hex,
      ],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      transactionHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: receipt.gasUsed.toString(),
      from,
      to,
      amount,
    });
  } catch (error: any) {
    console.error("Payment processing error:", error);

    // Handle specific errors
    if (error.message?.includes("insufficient funds")) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    if (
      error.message?.includes("nonce") ||
      error.message?.includes("expired")
    ) {
      return NextResponse.json(
        { error: "Authorization expired" },
        { status: 400 }
      );
    }

    if (error.message?.includes("already used")) {
      return NextResponse.json(
        { error: "Authorization already used" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: "Plenmo Payment API",
    version: "1.0.0",
    status: "operational",
    endpoints: {
      POST: "/api/payment - Process payment with EIP-3009 authorization",
    },
  });
}
