/**
 * Resend Request Notification API
 * 
 * POST /api/requests/[id]/resend - Resend the notification email for a payment request
 */

import { NextResponse } from 'next/server';
import { prisma, notifications as notifyHelpers } from '@plasma-pay/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { senderAddress } = body;

    // Fetch the payment request
    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Verify the sender owns this request
    if (paymentRequest.fromAddress.toLowerCase() !== senderAddress?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized - only the sender can resend notifications' },
        { status: 403 }
      );
    }

    // Check if request is still pending
    if (paymentRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot resend notification - request is ${paymentRequest.status}` },
        { status: 400 }
      );
    }

    // Check if recipient has an email
    const isEmail = paymentRequest.toIdentifier.includes('@');
    if (!isEmail) {
      return NextResponse.json(
        { error: 'Cannot resend notification - recipient does not have an email' },
        { status: 400 }
      );
    }

    // Create a new notification
    const notification = await notifyHelpers.create({
      recipientEmail: paymentRequest.toIdentifier,
      recipientAddress: paymentRequest.toAddress || undefined,
      type: 'payment_request',
      title: 'Payment Request Reminder',
      body: `${paymentRequest.fromEmail || paymentRequest.fromAddress.slice(0, 6) + '...'} requested $${paymentRequest.amount} USDT0`,
      data: {
        requestId: paymentRequest.id,
        amount: paymentRequest.amount,
        fromAddress: paymentRequest.fromAddress,
        fromEmail: paymentRequest.fromEmail,
        memo: paymentRequest.memo,
        isReminder: true,
      },
      relatedType: 'payment_request',
      relatedId: paymentRequest.id,
    });

    // Process the notification immediately
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    try {
      await fetch(`${baseUrl}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notification.id }),
      });
    } catch (error) {
      console.error('[resend] Failed to send notification:', error);
      // Don't fail the request if notification fails - it's queued
    }

    return NextResponse.json({
      success: true,
      message: 'Notification resent successfully',
      notificationId: notification.id,
    });
  } catch (error) {
    console.error('Resend notification error:', error);
    return NextResponse.json(
      { error: 'Failed to resend notification' },
      { status: 500 }
    );
  }
}
