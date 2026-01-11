/**
 * Payment Status API Route
 * 
 * SUB-002: Server-side payment verification
 * Replaces localStorage with database-backed payment status check.
 * 
 * GET /api/payment-status?address={walletAddress}
 * Returns: { hasPaid: boolean, txHash?: string, paidAt?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/payment-status';

/**
 * GET /api/payment-status
 * 
 * Check if a wallet address has paid for SubKiller Pro.
 * This replaces the localStorage-based payment check.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    const status = await getPaymentStatus(address);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
