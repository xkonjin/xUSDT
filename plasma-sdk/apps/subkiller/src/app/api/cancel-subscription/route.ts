/**
 * Subscription Cancellation API Endpoint
 * 
 * SUB-004: Implement subscription cancellation via email
 * POST /api/cancel-subscription - Generate cancellation email and track attempt
 * GET /api/cancel-subscription - Get cancellation status for subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  generateCancellationEmailTemplate, 
  trackCancellationAttempt, 
  getCancellationStatus,
  getCancellationAttempts,
  type CancellationStatus,
} from '@/lib/cancellation-email';
import type { Subscription } from '@/types';

// Type for request body
interface CancelSubscriptionRequest {
  subscription: Subscription;
  action: 'preview' | 'send' | 'copy' | 'status';
  walletAddress?: string;
}

/**
 * POST /api/cancel-subscription
 * Generate a cancellation email template and optionally track the attempt
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null;
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in with Google' },
        { status: 401 }
      );
    }

    const body: CancelSubscriptionRequest = await req.json();
    const { subscription, action, walletAddress } = body;

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription data is required' },
        { status: 400 }
      );
    }

    // Generate the cancellation email template
    const emailTemplate = await generateCancellationEmailTemplate(subscription);

    // If just previewing, return the template without tracking
    if (action === 'preview') {
      return NextResponse.json({
        success: true,
        template: emailTemplate,
        action: 'preview',
      });
    }

    // For other actions, we need a wallet address for tracking
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required for tracking cancellation' },
        { status: 400 }
      );
    }

    // Map action to cancellation status
    let status: CancellationStatus;
    switch (action) {
      case 'send':
        status = 'email_sent';
        break;
      case 'copy':
        status = 'copied';
        break;
      case 'status': {
        // Just get current status
        const currentStatus = await getCancellationStatus(walletAddress, subscription.id);
        return NextResponse.json({
          success: true,
          status: currentStatus,
        });
      }
      default:
        status = 'pending';
    }

    // Track the cancellation attempt
    const attempt = await trackCancellationAttempt(walletAddress, subscription, status);

    return NextResponse.json({
      success: true,
      template: emailTemplate,
      attempt,
      action,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process cancellation request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cancel-subscription
 * Get cancellation status for a specific subscription or all subscriptions
 */
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null;
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in with Google' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('address');
    const subscriptionId = searchParams.get('subscriptionId');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // If specific subscription ID provided, get that status
    if (subscriptionId) {
      const status = await getCancellationStatus(walletAddress, subscriptionId);
      return NextResponse.json({
        success: true,
        status,
      });
    }

    // Otherwise get all cancellation attempts for this wallet
    const attempts = await getCancellationAttempts(walletAddress);
    return NextResponse.json({
      success: true,
      attempts,
    });
  } catch (error) {
    console.error('Get cancellation status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get cancellation status' },
      { status: 500 }
    );
  }
}
