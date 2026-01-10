/**
 * Payment Intent API
 * 
 * GET /api/pay/[intentId]
 * Retrieves payment intent data for the payment page.
 * 
 * This endpoint is called when a user opens a payment QR code/link.
 * Returns the bill details, amount, and recipient information.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';

/**
 * GET - Fetch payment intent by ID
 * 
 * Returns:
 * - intent: Payment intent data with bill and participant info
 */
export async function GET(
  _request: Request,
  { params }: { params: { intentId: string } }
) {
  try {
    const intentId = params.intentId;

    if (!intentId) {
      return NextResponse.json(
        { error: 'Intent ID is required' },
        { status: 400 }
      );
    }

    // Fetch payment intent with bill data
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: intentId },
      include: {
        bill: {
          include: {
            participants: true,
          },
        },
      },
    });

    if (!intent) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (intent.expiresAt < new Date() && intent.status === 'pending') {
      // Mark as expired
      await prisma.paymentIntent.update({
        where: { id: intentId },
        data: { status: 'expired' },
      });

      return NextResponse.json(
        { error: 'Payment link has expired' },
        { status: 410 }
      );
    }

    // Get participant name
    const participant = intent.bill.participants[intent.participantIndex];
    const participantName = participant?.name || `Person ${intent.participantIndex + 1}`;

    // Return sanitized intent data
    return NextResponse.json({
      intent: {
        id: intent.id,
        amountUsd: intent.amountUsd,
        recipientAddress: intent.recipientAddress,
        billTitle: intent.bill.title,
        participantName,
        status: intent.status,
        expiresAt: intent.expiresAt.toISOString(),
        destTxHash: intent.destTxHash,
      },
    });
  } catch (error) {
    console.error('Failed to fetch payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to load payment' },
      { status: 500 }
    );
  }
}

/**
 * POST - Mark payment as completed
 * 
 * Called by the payment page after successful transaction.
 * 
 * Body:
 * - payerAddress: Wallet address of the payer
 * - sourceTxHash: Transaction hash on source chain
 * - destTxHash: Transaction hash on Plasma (if available)
 * - sourceChainId: Source chain ID
 * - sourceToken: Source token address
 * - bridgeProvider: 'jumper' or 'debridge'
 */
export async function POST(
  request: Request,
  { params }: { params: { intentId: string } }
) {
  try {
    const intentId = params.intentId;
    const body = await request.json();

    const {
      payerAddress,
      sourceTxHash,
      destTxHash,
      sourceChainId,
      sourceToken,
      bridgeProvider,
    } = body;

    if (!payerAddress || !sourceTxHash) {
      return NextResponse.json(
        { error: 'payerAddress and sourceTxHash are required' },
        { status: 400 }
      );
    }

    // Update payment intent
    const intent = await prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: destTxHash ? 'completed' : 'processing',
        payerAddress,
        sourceTxHash,
        destTxHash,
        sourceChainId,
        sourceToken,
        bridgeProvider,
        paidAt: destTxHash ? new Date() : undefined,
      },
    });

    // If this is a same-chain payment (Plasma to Plasma), mark the bill participant as paid
    if (destTxHash) {
      const bill = await prisma.bill.findUnique({
        where: { id: intent.billId },
        include: { participants: true },
      });

      if (bill) {
        const participant = bill.participants[intent.participantIndex];
        if (participant) {
          await prisma.billParticipant.update({
            where: { id: participant.id },
            data: {
              paid: true,
              paidAt: new Date(),
              txHash: destTxHash,
            },
          });
        }

        // Check if all participants have paid
        const allPaid = bill.participants.every(
          (p, i) =>
            i === intent.participantIndex ||
            p.paid
        );

        if (allPaid) {
          await prisma.bill.update({
            where: { id: bill.id },
            data: { status: 'completed' },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: intent.status,
    });
  } catch (error) {
    console.error('Failed to update payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

