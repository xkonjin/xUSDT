/**
 * Balance API
 * 
 * Returns balance summary for a user across all bills.
 * 
 * Endpoints:
 * - GET /api/balance?address={address}&email={email}
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { calculateBalances, Bill } from '@/lib/balance-calculator';

/**
 * GET /api/balance
 * 
 * Returns balance summary showing what user owes and is owed.
 * 
 * Query params:
 * - address: User's wallet address (required)
 * - email: User's email for matching as participant (optional)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const email = searchParams.get('email');

    if (!address) {
      return NextResponse.json(
        { error: 'address query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch all bills created by user
    const createdBills = await prisma.bill.findMany({
      where: { creatorAddress: address },
      include: { participants: true },
    });

    // Fetch all bills where user is a participant (by email)
    let participatingBills: typeof createdBills = [];
    if (email) {
      participatingBills = await prisma.bill.findMany({
        where: {
          participants: {
            some: { email: email },
          },
          NOT: { creatorAddress: address }, // Exclude bills they created
        },
        include: { participants: true },
      });
    }

    // Combine and dedupe bills
    const allBills = [...createdBills, ...participatingBills];
    const uniqueBillIds = new Set<string>();
    const uniqueBills = allBills.filter(bill => {
      if (uniqueBillIds.has(bill.id)) return false;
      uniqueBillIds.add(bill.id);
      return true;
    });

    // Convert to balance calculator format
    const bills: Bill[] = uniqueBills.map(bill => ({
      id: bill.id,
      creatorAddress: bill.creatorAddress,
      total: bill.total,
      participants: bill.participants.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        share: p.share,
        paid: p.paid,
      })),
    }));

    // Calculate balances
    const balanceSummary = calculateBalances(address, bills, email || undefined);

    return NextResponse.json({
      success: true,
      ...balanceSummary,
    });
  } catch (error) {
    console.error('Balance API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate balances' },
      { status: 500 }
    );
  }
}
