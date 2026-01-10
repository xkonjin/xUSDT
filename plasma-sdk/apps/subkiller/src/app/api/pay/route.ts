/**
 * SubKiller Payment API Route
 *
 * Handles gasless USDT0 payment submissions for the SubKiller service.
 * Receives EIP-3009 transferWithAuthorization signatures and executes
 * them on the Plasma chain via the relayer.
 *
 * Uses RELAYER wallet to pay gas (same pattern as bill-split and plasma-stream).
 * The relayer executes transferWithAuthorization on behalf of the user.
 *
 * Flow:
 * 1. Client signs EIP-712 typed data authorizing a $0.99 USDT0 transfer
 * 2. Client sends signature to this endpoint
 * 3. This endpoint uses the RELAYER wallet to execute the transfer on-chain
 * 4. Returns transaction hash on success
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { PLASMA_MAINNET_RPC, plasmaMainnet, USDT0_ADDRESS } from '@plasma-pay/core';
import { SUBKILLER_PRICE } from '@/lib/payment';

// In-memory store for payments (use Redis/DB in production)
const payments = new Map<string, {
  status: string;
  txHash?: string;
  paidAt?: Date;
  from: string;
}>();

// Direct relayer wallet configuration (same as bill-split and plasma-stream)
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;

// Merchant address to receive payments
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || process.env.NEXT_PUBLIC_MERCHANT_ADDRESS;

// Create Plasma public client for transaction confirmation
const publicClient = createPublicClient({
  chain: plasmaMainnet,
  transport: http(PLASMA_MAINNET_RPC),
});

// ABI for transferWithAuthorization function
const TRANSFER_WITH_AUTH_ABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

interface PaymentRequest {
  from: string;
  signature: {
    v: number;
    r: string;
    s: string;
  };
  typedData: {
    domain: unknown;
    types: unknown;
    primaryType: string;
    message: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

/**
 * POST /api/pay
 *
 * Handles gasless payment submissions from the client.
 * Expects signed EIP-3009 authorization for transferWithAuthorization.
 */
export async function POST(req: NextRequest) {
  try {
    // Check relayer is configured
    if (!RELAYER_KEY) {
      return NextResponse.json(
        { error: 'Relayer not configured. Set RELAYER_PRIVATE_KEY in environment.' },
        { status: 500 }
      );
    }

    const body: PaymentRequest = await req.json();
    const { from, signature, typedData } = body;

    // Validate required fields
    if (!from || !signature || !typedData) {
      return NextResponse.json(
        { error: 'Missing required fields: from, signature, typedData' },
        { status: 400 }
      );
    }

    // Validate signature components
    if (typeof signature.v !== 'number' || !signature.r || !signature.s) {
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 400 }
      );
    }

    // Extract transfer params from typed data
    const message = typedData.message;
    if (!message) {
      return NextResponse.json(
        { error: 'Missing message in typed data' },
        { status: 400 }
      );
    }

    // Validate the payment is going to the merchant
    if (MERCHANT_ADDRESS && message.to.toLowerCase() !== MERCHANT_ADDRESS.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid payment recipient' },
        { status: 400 }
      );
    }

    // Validate payment amount matches SubKiller price
    const paymentAmount = BigInt(message.value);
    if (paymentAmount !== SUBKILLER_PRICE) {
      return NextResponse.json(
        { error: `Invalid payment amount. Expected ${SUBKILLER_PRICE}, got ${paymentAmount}` },
        { status: 400 }
      );
    }

    // Validate timing constraints
    const now = Math.floor(Date.now() / 1000);
    const validAfter = Number(message.validAfter);
    const validBefore = Number(message.validBefore);

    if (now < validAfter || now >= validBefore) {
      return NextResponse.json(
        { error: 'Authorization has expired or is not yet valid' },
        { status: 400 }
      );
    }

    // Generate a unique invoice ID for this payment
    const invoiceId = `sk_${from.slice(2, 10)}_${Date.now()}`;

    // Check if this user already paid
    const existingPayment = Array.from(payments.values()).find(
      p => p.from.toLowerCase() === from.toLowerCase() && p.status === 'completed'
    );
    if (existingPayment) {
      return NextResponse.json({
        type: 'payment-completed',
        invoiceId,
        txHash: existingPayment.txHash,
        status: 'already-paid',
      });
    }

    // Create wallet client with relayer account
    const account = privateKeyToAccount(RELAYER_KEY);
    const walletClient = createWalletClient({
      account,
      chain: plasmaMainnet,
      transport: http(PLASMA_MAINNET_RPC),
    });

    // Execute transferWithAuthorization on-chain
    const txHash = await walletClient.writeContract({
      address: USDT0_ADDRESS,
      abi: TRANSFER_WITH_AUTH_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        message.from as Address,
        message.to as Address,
        BigInt(message.value),
        BigInt(message.validAfter),
        BigInt(message.validBefore),
        message.nonce as Hex,
        signature.v,
        signature.r as Hex,
        signature.s as Hex,
      ],
    });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 30000,
    });

    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'Transaction reverted' },
        { status: 500 }
      );
    }

    // Store payment record
    payments.set(invoiceId, {
      status: 'completed',
      txHash,
      paidAt: new Date(),
      from: from.toLowerCase(),
    });

    return NextResponse.json({
      type: 'payment-completed',
      invoiceId,
      txHash,
      network: 'plasma',
      status: 'completed',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment processing failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pay?invoiceId=xxx
 *
 * Check payment status for a given invoice ID.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get('invoiceId');

  if (!invoiceId) {
    return NextResponse.json(
      { error: 'Missing invoiceId' },
      { status: 400 }
    );
  }

  const payment = payments.get(invoiceId);
  if (!payment) {
    return NextResponse.json({ status: 'pending' });
  }

  return NextResponse.json(payment);
}
