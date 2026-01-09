/**
 * Bill Detail API
 * 
 * Handles individual bill operations.
 * 
 * Test Mode:
 * Set TEST_PAYMENT_RECIPIENT env var to override creatorAddress.
 * This allows testing payments without needing two wallets.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';

// Optional: Override recipient address for testing (prevents from==to error)
const TEST_PAYMENT_RECIPIENT = process.env.TEST_PAYMENT_RECIPIENT;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bills/[id]
 * 
 * Gets a bill by ID with all items and participants.
 */
export async function GET(
  _request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params;

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        items: {
          include: { assignments: true },
        },
        participants: {
          include: { assignments: true },
        },
      },
    });

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Use test recipient if set (allows testing with single wallet)
    const effectiveCreatorAddress = TEST_PAYMENT_RECIPIENT || bill.creatorAddress;
    
    if (TEST_PAYMENT_RECIPIENT) {
      console.log('[bill-api] TEST MODE: Overriding creatorAddress', {
        original: bill.creatorAddress,
        override: TEST_PAYMENT_RECIPIENT,
      });
    }

    return NextResponse.json({
      success: true,
      bill: {
        ...bill,
        creatorAddress: effectiveCreatorAddress, // May be overridden for testing
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
        participants: bill.participants.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          paidAt: p.paidAt?.toISOString(),
        })),
        items: bill.items.map(i => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Get bill error:', error);
    return NextResponse.json(
      { error: 'Failed to get bill' },
      { status: 500 }
    );
  }
}

