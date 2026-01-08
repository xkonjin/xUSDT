/**
 * Notification Service API
 * 
 * Handles sending email notifications for various events.
 * Uses Resend for email delivery (can be swapped for SendGrid, etc.)
 * 
 * Endpoints:
 * - POST /api/notify - Send a notification
 * - GET /api/notify - Get pending notifications (for processing)
 */

import { NextResponse } from 'next/server';
import { prisma, notifications as notifyHelpers, type NotificationType } from '@plasma-pay/db';

// Email templates for different notification types
const EMAIL_TEMPLATES: Record<NotificationType, {
  subject: (data: any) => string;
  html: (data: any) => string;
}> = {
  payment_received: {
    subject: (data) => `You received $${data.amount} USDT0`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00d4ff;">Payment Received!</h1>
        <p>You received <strong>$${data.amount} USDT0</strong> from ${data.senderAddress?.slice(0, 6)}...${data.senderAddress?.slice(-4) || 'someone'}.</p>
        ${data.memo ? `<p style="color: #666; font-style: italic;">"${data.memo}"</p>` : ''}
        ${data.txHash ? `<p><a href="https://scan.plasma.to/tx/${data.txHash}" style="color: #00d4ff;">View transaction</a></p>` : ''}
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Plasma Venmo - Zero gas fees on Plasma Chain</p>
      </div>
    `,
  },
  payment_request: {
    subject: (data) => `Payment request for $${data.amount} USDT0`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00d4ff;">Payment Request</h1>
        <p><strong>${data.fromAddress?.slice(0, 6)}...${data.fromAddress?.slice(-4) || 'Someone'}</strong> is requesting <strong>$${data.amount} USDT0</strong> from you.</p>
        ${data.memo ? `<p style="color: #666; font-style: italic;">"${data.memo}"</p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}" style="display: inline-block; background: #00d4ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Open Plasma Venmo</a></p>
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Plasma Venmo - Zero gas fees on Plasma Chain</p>
      </div>
    `,
  },
  claim_available: {
    subject: (data) => `You received $${data.amount} USDT0 - Claim now!`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00d4ff;">🎁 You Received Money!</h1>
        <p><strong>${data.senderAddress?.slice(0, 6)}...${data.senderAddress?.slice(-4) || 'Someone'}</strong> sent you <strong>$${data.amount} USDT0</strong>!</p>
        ${data.memo ? `<p style="color: #666; font-style: italic;">"${data.memo}"</p>` : ''}
        <p><a href="${data.claimUrl}" style="display: inline-block; background: linear-gradient(to right, #00d4ff, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: bold; font-size: 18px;">Claim Your $${data.amount} USDT0</a></p>
        <p style="color: #666; margin-top: 20px;">This claim expires in 30 days.</p>
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Plasma Venmo - Zero gas fees on Plasma Chain</p>
      </div>
    `,
  },
  payment_completed: {
    subject: (data) => `Payment of $${data.amount} USDT0 completed`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00d4ff;">✅ Payment Completed</h1>
        <p>Your payment or request for <strong>$${data.amount} USDT0</strong> has been completed!</p>
        ${data.txHash ? `<p><a href="https://scan.plasma.to/tx/${data.txHash}" style="color: #00d4ff;">View transaction</a></p>` : ''}
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Plasma Venmo - Zero gas fees on Plasma Chain</p>
      </div>
    `,
  },
  request_declined: {
    subject: (data) => `Payment request declined`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f87171;">Request Declined</h1>
        <p>Your payment request for <strong>$${data.amount} USDT0</strong> was declined.</p>
        ${data.reason ? `<p style="color: #666;">Reason: ${data.reason}</p>` : ''}
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Plasma Venmo - Zero gas fees on Plasma Chain</p>
      </div>
    `,
  },
  bill_created: {
    subject: (data) => `New bill: ${data.title}`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00d4ff;">📋 New Bill Created</h1>
        <p>A new bill "<strong>${data.title}</strong>" has been created.</p>
        <p>Total: <strong>$${data.total} USDT0</strong></p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL?.replace('plasma-venmo', 'bill-split') || 'http://localhost:3003'}/bill/${data.billId}" style="display: inline-block; background: #00d4ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Bill</a></p>
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Bill Split - Powered by Plasma Chain</p>
      </div>
    `,
  },
  bill_share_assigned: {
    subject: (data) => `Your share: $${data.share} USDT0`,
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00d4ff;">💰 Pay Your Share</h1>
        <p>Your share of "<strong>${data.title}</strong>" is <strong>$${data.share} USDT0</strong>.</p>
        <p><a href="${data.paymentUrl}" style="display: inline-block; background: #00d4ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Pay Now</a></p>
        <hr style="border-color: #333; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">Bill Split - Zero gas fees on Plasma Chain</p>
      </div>
    `,
  },
};

/**
 * POST /api/notify
 * 
 * Sends a notification via email.
 * This can be called directly or will process pending notifications.
 * 
 * Request body:
 * - notificationId: ID of notification to send (optional)
 * - OR create new notification inline:
 *   - recipientEmail: Email address
 *   - type: Notification type
 *   - data: Additional data for templates
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { notificationId, recipientEmail, type, data } = body;

    let notification;

    if (notificationId) {
      // Fetch existing notification
      notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }
    } else if (recipientEmail && type) {
      // Create and send inline
      notification = await prisma.notification.create({
        data: {
          recipientEmail,
          type,
          title: EMAIL_TEMPLATES[type as NotificationType]?.subject(data) || type,
          body: '',
          data: data ? JSON.stringify(data) : null,
          status: 'pending',
        },
      });
    } else {
      return NextResponse.json(
        { error: 'notificationId or (recipientEmail + type) required' },
        { status: 400 }
      );
    }

    // Get template
    const template = EMAIL_TEMPLATES[notification.type as NotificationType];
    if (!template) {
      await notifyHelpers.markFailed(notification.id, 'Unknown notification type');
      return NextResponse.json(
        { error: 'Unknown notification type' },
        { status: 400 }
      );
    }

    // Parse data
    const notificationData = notification.data ? JSON.parse(notification.data) : {};

    // Check for Resend API key
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      // Log notification but mark as sent (dev mode)
      console.log('📧 Notification (dev mode - no RESEND_API_KEY):');
      console.log('  To:', notification.recipientEmail);
      console.log('  Subject:', template.subject(notificationData));
      console.log('  Type:', notification.type);
      
      await notifyHelpers.markSent(notification.id);
      
      return NextResponse.json({
        success: true,
        message: 'Notification logged (dev mode)',
        id: notification.id,
      });
    }

    // Send via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Plasma Venmo <noreply@plasma.to>',
        to: notification.recipientEmail,
        subject: template.subject(notificationData),
        html: template.html(notificationData),
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      await notifyHelpers.markFailed(notification.id, JSON.stringify(errorData));
      return NextResponse.json(
        { error: 'Failed to send email', details: errorData },
        { status: 500 }
      );
    }

    // Mark as sent
    await notifyHelpers.markSent(notification.id);

    return NextResponse.json({
      success: true,
      id: notification.id,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notify
 * 
 * Gets pending notifications for processing.
 * Also triggers processing of all pending notifications.
 * 
 * Query params:
 * - process: If 'true', will process all pending notifications
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldProcess = searchParams.get('process') === 'true';

    // Get pending notifications
    const pending = await notifyHelpers.getPending();

    if (shouldProcess && pending.length > 0) {
      // Process all pending notifications
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
      
      const results = await Promise.all(
        pending.map(async (notification) => {
          try {
            const response = await fetch(`${baseUrl}/api/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notificationId: notification.id }),
            });
            return { id: notification.id, success: response.ok };
          } catch {
            return { id: notification.id, success: false };
          }
        })
      );

      return NextResponse.json({
        success: true,
        processed: results,
        total: results.length,
        succeeded: results.filter(r => r.success).length,
      });
    }

    return NextResponse.json({
      success: true,
      pending: pending.map(n => ({
        id: n.id,
        type: n.type,
        recipientEmail: n.recipientEmail,
        createdAt: n.createdAt.toISOString(),
      })),
      count: pending.length,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

