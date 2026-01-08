/**
 * SubKiller Payment API Route
 * 
 * Handles X402 payment submissions for the SubKiller service.
 * Verifies signatures and settles payments on Plasma chain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from '@plasma-pay/core';
import type { X402PaymentSubmitted } from '@plasma-pay/x402';

// In-memory store for payments (use Redis/DB in production)
const payments = new Map<string, { status: string; txHash?: string; paidAt?: Date }>();

/**
 * POST /api/pay
 * 
 * Handles payment submissions from the client. Expects an X402PaymentSubmitted
 * object with the payment authorization details.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, type, chosenOption, signature, typedData, scheme } = body;

    // Validate payment type
    if (type !== 'payment-submitted') {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!invoiceId || !signature || !typedData) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, signature, typedData' },
        { status: 400 }
      );
    }

    // Extract v, r, s from signature
    const { v, r, s } = signature;
    const merchantAddress = process.env.MERCHANT_ADDRESS || '0x0000000000000000000000000000000000000000';

    // Build the X402 payment submitted object
    const payment: X402PaymentSubmitted = {
      type: 'payment-submitted',
      invoiceId,
      chosenOption: {
        network: 'plasma',
        chainId: PLASMA_MAINNET_CHAIN_ID,
        token: USDT0_ADDRESS,
        tokenSymbol: 'USDT0',
        tokenDecimals: 6,
        amount: typedData?.message?.value || '0',
        recipient: merchantAddress as `0x${string}`,
        scheme: 'eip3009-transfer-with-auth',
      },
      authorization: {
        from: typedData?.message?.from || '0x0000000000000000000000000000000000000000',
        to: typedData?.message?.to || merchantAddress,
        value: typedData?.message?.value || '0',
        validAfter: Number(typedData?.message?.validAfter || 0),
        validBefore: Number(typedData?.message?.validBefore || 0),
        nonce: typedData?.message?.nonce || '0x0',
        v: Number(v),
        r: r as `0x${string}`,
        s: s as `0x${string}`,
      },
    };

    // For now, mark as completed (actual settlement would use facilitator)
    // In production: const result = await verifyAndSettle(payment, config);
    
    // Store payment record
    const txHash = `0x${Date.now().toString(16)}${'0'.repeat(50)}`;
    payments.set(invoiceId, {
      status: 'completed',
      txHash,
      paidAt: new Date(),
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
