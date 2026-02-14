import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchSubscriptionEmails } from '@/lib/gmail';
import { detectSubscriptions, calculateTotals } from '@/lib/subscription-detector';

export async function POST(req: NextRequest) {
  void req;
  try {
    const session = (await getServerSession(authOptions)) as Session | null;
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - no access token' },
        { status: 401 }
      );
    }

    const startTime = Date.now();

    // Fetch subscription-related emails from Gmail
    const emails = await fetchSubscriptionEmails(session.accessToken, 500);

    // Detect subscriptions from email patterns
    const subscriptions = detectSubscriptions(emails);
    const totals = calculateTotals(subscriptions);

    const scanDuration = Date.now() - startTime;

    return NextResponse.json({
      subscriptions,
      totalEstimatedMonthly: totals.monthly,
      totalEstimatedYearly: totals.yearly,
      scannedEmails: emails.length,
      scanDuration,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
