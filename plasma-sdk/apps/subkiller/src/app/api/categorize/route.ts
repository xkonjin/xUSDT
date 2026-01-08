import { NextRequest, NextResponse } from 'next/server';
import { categorizeWithAI } from '@/lib/ai-categorizer';
import type { Subscription } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscriptions } = body as { subscriptions: Partial<Subscription>[] };

    if (!subscriptions || !Array.isArray(subscriptions)) {
      return NextResponse.json(
        { error: 'Invalid request - subscriptions array required' },
        { status: 400 }
      );
    }

    // Use AI to categorize and enhance subscription data
    const categorized = await categorizeWithAI(subscriptions);

    return NextResponse.json({
      subscriptions: categorized,
    });
  } catch (error) {
    console.error('Categorize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Categorization failed' },
      { status: 500 }
    );
  }
}
