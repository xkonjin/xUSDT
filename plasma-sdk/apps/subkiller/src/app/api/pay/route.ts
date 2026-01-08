/**
 * SubKiller Payment API Route
 * 
 * Handles gasless USDT0 payment submissions for the SubKiller service.
 * Receives EIP-3009 transferWithAuthorization signatures and executes
 * them on the Plasma chain via the relayer.
 * 
 * Flow:
 * 1. Client signs EIP-712 typed data authorizing a $0.99 USDT0 transfer
 * 2. Client sends signature to this endpoint
 * 3. This endpoint calls the Plasma relayer API to execute the transfer
 * 4. Returns transaction hash on success
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, type Hex } from 'viem';
import { PLASMA_MAINNET_RPC, plasmaMainnet, USDT0_ADDRESS } from '@plasma-pay/core';
import { SUBKILLER_PRICE } from '@/lib/payment';

// In-memory store for payments (use Redis/DB in production)
const payments = new Map<string, { 
  status: string; 
  txHash?: string; 
  paidAt?: Date;
  from: string;
}>();

// Plasma relayer API configuration
const RELAYER_API = process.env.PLASMA_RELAYER_API || 'https://api.plasmachain.io/gasless/relay';
const RELAYER_SECRET = process.env.PLASMA_RELAYER_SECRET;

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
    domain: any;
    types: any;
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

    let txHash: string;

    // Try to use the Plasma relayer API if configured
    if (RELAYER_SECRET && RELAYER_API) {
      try {
        const relayerResponse = await fetch(RELAYER_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RELAYER_SECRET}`,
            'X-Forwarded-For': req.headers.get('x-forwarded-for') || 'unknown',
          },
          body: JSON.stringify({
            token: USDT0_ADDRESS,
            from: message.from,
            to: message.to,
            value: message.value,
            validAfter: message.validAfter,
            validBefore: message.validBefore,
            nonce: message.nonce,
            v: signature.v,
            r: signature.r,
            s: signature.s,
          }),
        });

        if (!relayerResponse.ok) {
          const error = await relayerResponse.json().catch(() => ({}));
          throw new Error(error.message || 'Relayer request failed');
        }

        const relayerResult = await relayerResponse.json();
        txHash = relayerResult.txHash;

        // Wait for confirmation if needed
        if (relayerResult.status === 'pending') {
          // Poll for confirmation
          let confirmed = false;
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1000));
            try {
              const receipt = await publicClient.getTransactionReceipt({
                hash: txHash as Hex,
              });
              if (receipt && receipt.status === 'success') {
                confirmed = true;
                break;
              }
            } catch {
              // Transaction not yet mined, continue polling
            }
          }
          if (!confirmed) {
            throw new Error('Transaction not confirmed within timeout');
          }
        }
      } catch (relayerError) {
        console.error('Relayer error:', relayerError);
        // Fall back to simulation mode in development
        if (process.env.NODE_ENV !== 'development') {
          throw relayerError;
        }
        // Development mode: generate mock tx hash
        console.warn('DEV MODE: Using simulated payment');
        txHash = `0x${Array.from({ length: 64 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('')}`;
      }
    } else {
      // No relayer configured - development/demo mode
      console.warn('No relayer configured, using simulated payment');
      txHash = `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;
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
    console.error('Payment error:', error);
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
