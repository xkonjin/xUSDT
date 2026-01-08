import { NextRequest, NextResponse } from 'next/server';
import { PLASMA_CHAIN_ID, USDT0_ADDRESS } from '@plasma-pay/core';
import { verifyPayment, settlePayment } from '@plasma-pay/x402';

// In-memory store for payments (use Redis/DB in production)
const payments = new Map<string, { status: string; txHash?: string; paidAt?: Date }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, type, chosenOption, signature, typedData, scheme } = body;

    if (type !== 'payment-submitted') {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      );
    }

    if (!invoiceId || !signature || !typedData) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, signature, typedData' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const verification = await verifyPayment({
      signature,
      typedData,
      expectedRecipient: process.env.MERCHANT_ADDRESS!,
      expectedChainId: PLASMA_CHAIN_ID,
      expectedToken: USDT0_ADDRESS,
    });

    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid payment signature', details: verification.error },
        { status: 402 }
      );
    }

    // Settle the payment on-chain
    const settlement = await settlePayment({
      signature,
      typedData,
      relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY!,
      rpcUrl: process.env.PLASMA_RPC || 'https://rpc.plasma.to',
    });

    if (!settlement.success) {
      return NextResponse.json(
        { error: 'Settlement failed', details: settlement.error },
        { status: 500 }
      );
    }

    // Store payment record
    payments.set(invoiceId, {
      status: 'completed',
      txHash: settlement.txHash,
      paidAt: new Date(),
    });

    return NextResponse.json({
      type: 'payment-completed',
      invoiceId,
      txHash: settlement.txHash,
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
