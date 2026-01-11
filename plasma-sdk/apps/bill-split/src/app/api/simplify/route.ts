/**
 * Simplify Debts API
 * 
 * Returns simplified payment plan for a user's debts.
 * 
 * Endpoints:
 * - GET /api/simplify?address={address}&email={email}
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { simplifyDebts, Debt } from '@/lib/simplify-debts';

/**
 * GET /api/simplify
 * 
 * Returns simplified payment suggestions to minimize number of transactions.
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

    const normalizedAddress = address.toLowerCase();
    const normalizedEmail = email?.toLowerCase().trim();

    // Fetch all bills created by user
    const createdBills = await prisma.bill.findMany({
      where: { creatorAddress: address },
      include: { participants: true },
    });

    // Fetch all bills where user is a participant (by email)
    let participatingBills: typeof createdBills = [];
    if (normalizedEmail) {
      participatingBills = await prisma.bill.findMany({
        where: {
          participants: {
            some: { email: normalizedEmail },
          },
          NOT: { creatorAddress: address },
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

    // Extract all debts from bills
    const debts: Debt[] = [];

    for (const bill of uniqueBills) {
      const isCreator = bill.creatorAddress.toLowerCase() === normalizedAddress;

      for (const participant of bill.participants) {
        if (participant.paid) continue;

        const participantEmail = participant.email?.toLowerCase().trim();
        const isParticipantMe = participantEmail && normalizedEmail && 
          participantEmail === normalizedEmail;

        if (isCreator) {
          // I created this bill - participants owe me (except myself)
          if (!isParticipantMe) {
            debts.push({
              debtor: participant.name,
              creditor: 'You',
              amount: participant.share,
            });
          }
        } else if (isParticipantMe) {
          // Someone else created this bill - I owe them
          // Use creator address as identifier since we don't have their name
          debts.push({
            debtor: 'You',
            creditor: bill.creatorAddress,
            amount: participant.share,
          });
        }
      }
    }

    // Simplify the debts
    const result = simplifyDebts(debts);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Simplify API error:', error);
    return NextResponse.json(
      { error: 'Failed to simplify debts' },
      { status: 500 }
    );
  }
}
