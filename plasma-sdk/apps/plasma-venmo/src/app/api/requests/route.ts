/**
 * Payment Requests API
 * 
 * Handles creating and listing payment requests.
 * A payment request allows a user to request money from someone else.
 * 
 * Endpoints:
 * - POST /api/requests - Create a new payment request
 * - GET /api/requests - List payment requests (sent and received)
 */

import { NextResponse } from 'next/server';
import { prisma, notifications as notifyHelpers, type PaymentRequest } from '@plasma-pay/db';
import type { Address } from 'viem';

/**
 * POST /api/requests
 * 
 * Creates a new payment request.
 * 
 * Request body:
 * - fromAddress: Who is requesting the payment
 * - fromEmail: Optional email for display
 * - toIdentifier: Email, phone, or wallet address of who should pay
 * - amount: Amount to request (in USDT0)
 * - memo: Optional reason for the request
 * - expiresInDays: Optional expiration (default: 7 days)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromAddress, fromEmail, toIdentifier, amount, memo, expiresInDays } = body;

    // Validate required fields
    if (!fromAddress) {
      return NextResponse.json(
        { error: 'fromAddress is required' },
        { status: 400 }
      );
    }

    if (!toIdentifier) {
      return NextResponse.json(
        { error: 'toIdentifier is required' },
        { status: 400 }
      );
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Calculate expiration
    const days = expiresInDays || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Try to resolve recipient to an address if it's an email or phone
    let toAddress: string | null = null;
    if (toIdentifier.startsWith('0x') && toIdentifier.length === 42) {
      // It's already a wallet address
      toAddress = toIdentifier;
    } else {
      // Try to resolve via Privy
      try {
        const resolveResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/api/resolve-recipient`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: toIdentifier }),
          }
        );
        
        if (resolveResponse.ok) {
          const data = await resolveResponse.json();
          toAddress = data.address;
        }
      } catch (error) {
        // Recipient not found - that's okay, they can still see the request
        console.log('Could not resolve recipient:', error);
      }
    }

    // Create the payment request
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        fromAddress,
        fromEmail,
        toIdentifier: toIdentifier.toLowerCase(),
        toAddress,
        amount: parseFloat(amount),
        currency: 'USDT0',
        memo,
        status: 'pending',
        expiresAt,
      },
    });

    // Create notification for recipient (if they have an email) and send it
    const isEmail = toIdentifier.includes('@');
    if (isEmail) {
      const notification = await notifyHelpers.create({
        recipientEmail: toIdentifier,
        recipientAddress: toAddress || undefined,
        type: 'payment_request',
        title: 'Payment Request',
        body: `${fromEmail || fromAddress.slice(0, 6) + '...'} requested $${amount} USDT0`,
        data: {
          requestId: paymentRequest.id,
          amount,
          fromAddress,
          fromEmail,
          memo,
        },
        relatedType: 'payment_request',
        relatedId: paymentRequest.id,
      });

      // Actually send the email notification
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
        const notifyResponse = await fetch(`${baseUrl}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notification.id }),
        });
        
        if (!notifyResponse.ok) {
          console.error('[requests] Failed to send notification email:', await notifyResponse.text());
        }
      } catch (notifyError) {
        console.error('[requests] Error sending notification:', notifyError);
      }
    }

    return NextResponse.json({
      success: true,
      request: {
        id: paymentRequest.id,
        fromAddress: paymentRequest.fromAddress,
        toIdentifier: paymentRequest.toIdentifier,
        toAddress: paymentRequest.toAddress,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        memo: paymentRequest.memo,
        status: paymentRequest.status,
        expiresAt: paymentRequest.expiresAt.toISOString(),
        createdAt: paymentRequest.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/requests
 * 
 * Lists payment requests for a user.
 * 
 * Query params:
 * - address: The wallet address (required)
 * - email: Optional email to also check for received requests
 * - type: Optional filter - 'sent' | 'received' | 'all' (default: 'all')
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const email = searchParams.get('email');
    const type = searchParams.get('type') || 'all';

    if (!address) {
      return NextResponse.json(
        { error: 'address query parameter is required' },
        { status: 400 }
      );
    }

    const results: {
      sent: any[];
      received: any[];
    } = {
      sent: [],
      received: [],
    };

    // Get sent requests
    if (type === 'all' || type === 'sent') {
      const sent = await prisma.paymentRequest.findMany({
        where: { fromAddress: address },
        orderBy: { createdAt: 'desc' },
      });

      results.sent = sent.map((r: PaymentRequest) => ({
        id: r.id,
        fromAddress: r.fromAddress,
        toIdentifier: r.toIdentifier,
        toAddress: r.toAddress,
        amount: r.amount,
        currency: r.currency,
        memo: r.memo,
        status: r.status,
        expiresAt: r.expiresAt.toISOString(),
        paidAt: r.paidAt?.toISOString(),
        txHash: r.txHash,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    // Get received requests
    if (type === 'all' || type === 'received') {
      const whereConditions: any[] = [
        { toAddress: address },
      ];

      if (email) {
        whereConditions.push({ toIdentifier: email.toLowerCase() });
      }

      const received = await prisma.paymentRequest.findMany({
        where: {
          OR: whereConditions,
          status: 'pending',
        },
        orderBy: { createdAt: 'desc' },
      });

      results.received = received.map((r: PaymentRequest) => ({
        id: r.id,
        fromAddress: r.fromAddress,
        fromEmail: r.fromEmail,
        toIdentifier: r.toIdentifier,
        amount: r.amount,
        currency: r.currency,
        memo: r.memo,
        status: r.status,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }));
    }

    return NextResponse.json({
      success: true,
      requests: results,
    });
  } catch (error) {
    console.error('List requests error:', error);
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        success: true,
        requests: { sent: [], received: [] },
        warning: 'Database unavailable',
      });
    }
    return NextResponse.json(
      { error: 'Failed to list payment requests' },
      { status: 500 }
    );
  }
}

