/**
 * Transaction History API Route
 *
 * GET /api/history?address=...&limit=...&offset=...
 *
 * Returns paginated transaction history for a given address
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  try {
    const normalizedAddress = address.toLowerCase();
    
    // Fetch activities where user is either actor or target
    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { actorAddress: normalizedAddress },
          { targetAddress: normalizedAddress },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
      select: {
        id: true,
        type: true,
        amount: true,
        actorAddress: true,
        actorName: true,
        targetAddress: true,
        targetName: true,
        memo: true,
        txHash: true,
        visibility: true,
        createdAt: true,
      },
    });

    const total = await prisma.activity.count({
      where: {
        OR: [
          { actorAddress: normalizedAddress },
          { targetAddress: normalizedAddress },
        ],
      },
    });

    // Transform activities to include direction
    const transactions = activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      amount: activity.amount,
      senderAddress: activity.actorAddress,
      senderName: activity.actorName,
      recipientAddress: activity.targetAddress,
      recipientName: activity.targetName,
      note: activity.memo,
      status: 'completed', // Activities are always completed transactions
      txHash: activity.txHash,
      createdAt: activity.createdAt,
      direction: activity.actorAddress.toLowerCase() === normalizedAddress ? 'sent' : 'received',
    }));

    return NextResponse.json({
      transactions,
      total,
      hasMore: offset + transactions.length < total,
    });
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
