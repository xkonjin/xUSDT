/**
 * Bill Detail API
 * 
 * Handles individual bill operations.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bills/[id]
 * 
 * Gets a bill by ID with all items and participants.
 */
export async function GET(
  request: Request,
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

    return NextResponse.json({
      success: true,
      bill: {
        ...bill,
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

