/**
 * Notification Service API
 * 
 * Handles sending email notifications for various events.
 * Uses Resend for email delivery when configured.
 * 
 * Note: Email notifications are optional. Users can share payment links
 * directly via text, DM, or any messaging app.
 * 
 * Environment variables:
 * - RESEND_API_KEY: Resend API key (optional)
 * - RESEND_FROM_EMAIL: Sender email for Resend
 * 
 * Endpoints:
 * - POST /api/notify - Send a notification
 * - GET /api/notify - Get pending notifications (for processing)
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma, notifications as notifyHelpers, type NotificationType, type Notification } from '@plasma-pay/db';

// Initialize Resend client
let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Email wrapper template with Plasma branding
function wrapEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700;">
                <span style="color: #00d4ff;">Plenmo</span>
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px; color: #ffffff;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 12px;">
                Zero gas fees on Plasma Chain
              </p>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.3); font-size: 11px;">
                Powered by <a href="https://plasma.to" style="color: #00d4ff; text-decoration: none;">Plasma</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Button style helper
const buttonStyle = `display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #00b4d8 100%); color: #000000; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;`;
const buttonStylePrimary = `display: inline-block; background: linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px;`;

// Email templates for different notification types
type TemplateBase = Record<string, unknown>;

type PaymentReceivedTemplateData = TemplateBase & {
  amount: number | string;
  senderAddress?: string;
  memo?: string;
  txHash?: string;
};

type PaymentRequestTemplateData = TemplateBase & {
  fromEmail?: string;
  fromAddress?: string;
  amount: number | string;
  memo?: string;
};

type ClaimAvailableTemplateData = TemplateBase & {
  amount: number | string;
  senderEmail?: string;
  senderAddress?: string;
  memo?: string;
  claimUrl: string;
  txHash?: string;
};

type PaymentCompletedTemplateData = TemplateBase & {
  amount: number | string;
  txHash?: string;
};

type RequestDeclinedTemplateData = TemplateBase & {
  amount: number | string;
  reason?: string;
};

type BillCreatedTemplateData = TemplateBase & {
  title: string;
  total: number | string;
  billId: string;
};

type BillShareAssignedTemplateData = TemplateBase & {
  share: number | string;
  title: string;
  paymentUrl: string;
};

type TemplateDataMap = {
  payment_received: PaymentReceivedTemplateData;
  payment_request: PaymentRequestTemplateData;
  claim_available: ClaimAvailableTemplateData;
  payment_completed: PaymentCompletedTemplateData;
  request_declined: RequestDeclinedTemplateData;
  bill_created: BillCreatedTemplateData;
  bill_share_assigned: BillShareAssignedTemplateData;
};

type EmailTemplateMap = {
  [K in NotificationType]: {
    subject: (data: TemplateDataMap[K]) => string;
    html: (data: TemplateDataMap[K]) => string;
  };
};

const EMAIL_TEMPLATES: EmailTemplateMap = {
  payment_received: {
    subject: (data) => `You received $${data.amount} USDT0`,
    html: (data) => wrapEmailTemplate(`
      <h2 style="margin: 0 0 16px; font-size: 28px; color: #00d4ff;">💰 Payment Received!</h2>
      <p style="margin: 0 0 24px; font-size: 16px; color: rgba(255,255,255,0.8); line-height: 1.5;">
        You received <strong style="color: #00d4ff;">$${data.amount} USDT0</strong> from 
        <span style="font-family: monospace; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${data.senderAddress?.slice(0, 6)}...${data.senderAddress?.slice(-4) || 'someone'}</span>
      </p>
      ${data.memo ? `<div style="background: rgba(255,255,255,0.05); border-left: 3px solid #00d4ff; padding: 12px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: rgba(255,255,255,0.7); font-style: italic;">"${data.memo}"</p></div>` : ''}
      ${data.txHash ? `<p style="margin: 24px 0 0;"><a href="https://scan.plasma.to/tx/${data.txHash}" style="color: #00d4ff; text-decoration: none;">View transaction on Plasma Scan →</a></p>` : ''}
    `),
  },
  payment_request: {
    subject: (data) => `${data.fromEmail || 'Someone'} is requesting $${data.amount} USDT0`,
    html: (data) => wrapEmailTemplate(`
      <h2 style="margin: 0 0 16px; font-size: 28px; color: #00d4ff;">📨 Payment Request</h2>
      <p style="margin: 0 0 24px; font-size: 16px; color: rgba(255,255,255,0.8); line-height: 1.5;">
        <strong>${data.fromEmail || data.fromAddress?.slice(0, 6) + '...' + data.fromAddress?.slice(-4) || 'Someone'}</strong> is requesting 
        <strong style="color: #00d4ff;">$${data.amount} USDT0</strong> from you.
      </p>
      ${data.memo ? `<div style="background: rgba(255,255,255,0.05); border-left: 3px solid #00d4ff; padding: 12px 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: rgba(255,255,255,0.7); font-style: italic;">"${data.memo}"</p></div>` : ''}
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}" style="${buttonStyle}">Open Plenmo</a>
      </div>
    `),
  },
  claim_available: {
    subject: (data) => `🎁 You received $${data.amount} USDT0 - Claim now!`,
    html: (data) => wrapEmailTemplate(`
      <div style="text-align: center;">
        <div style="font-size: 64px; margin-bottom: 16px;">🎁</div>
        <h2 style="margin: 0 0 16px; font-size: 32px; color: #ffffff;">You Received Money!</h2>
        <p style="margin: 0 0 8px; font-size: 48px; font-weight: 700; color: #00d4ff;">$${data.amount}</p>
        <p style="margin: 0 0 24px; font-size: 16px; color: rgba(255,255,255,0.5);">USDT0</p>
        <p style="margin: 0 0 24px; font-size: 16px; color: rgba(255,255,255,0.7);">
          From <span style="font-family: monospace; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${data.senderEmail || data.senderAddress?.slice(0, 6) + '...' + data.senderAddress?.slice(-4) || 'Someone'}</span>
        </p>
        ${data.memo ? `<div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin: 0 0 32px;"><p style="margin: 0; color: rgba(255,255,255,0.7); font-style: italic;">"${data.memo}"</p></div>` : ''}
        <a href="${data.claimUrl}" style="${buttonStylePrimary}">Claim Your $${data.amount} USDT0</a>
        <p style="margin: 24px 0 0; color: rgba(255,255,255,0.4); font-size: 14px;">This claim expires in 30 days</p>
      </div>
    `),
  },
  payment_completed: {
    subject: (data) => `✅ Payment of $${data.amount} USDT0 completed`,
    html: (data) => wrapEmailTemplate(`
      <div style="text-align: center;">
        <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
        <h2 style="margin: 0 0 16px; font-size: 28px; color: #22c55e;">Payment Completed!</h2>
        <p style="margin: 0 0 24px; font-size: 16px; color: rgba(255,255,255,0.8);">
          Your payment of <strong style="color: #00d4ff;">$${data.amount} USDT0</strong> has been completed.
        </p>
        ${data.txHash ? `<a href="https://scan.plasma.to/tx/${data.txHash}" style="color: #00d4ff; text-decoration: none;">View transaction on Plasma Scan →</a>` : ''}
      </div>
    `),
  },
  request_declined: {
    subject: () => `Payment request declined`,
    html: (data) => wrapEmailTemplate(`
      <h2 style="margin: 0 0 16px; font-size: 28px; color: #f87171;">Request Declined</h2>
      <p style="margin: 0 0 24px; font-size: 16px; color: rgba(255,255,255,0.8);">
        Your payment request for <strong>$${data.amount} USDT0</strong> was declined.
      </p>
      ${data.reason ? `<p style="color: rgba(255,255,255,0.6);">Reason: ${data.reason}</p>` : ''}
    `),
  },
  bill_created: {
    subject: (data) => `📋 New bill: ${data.title}`,
    html: (data) => wrapEmailTemplate(`
      <h2 style="margin: 0 0 16px; font-size: 28px; color: #00d4ff;">📋 New Bill Created</h2>
      <p style="margin: 0 0 16px; font-size: 16px; color: rgba(255,255,255,0.8);">
        A new bill "<strong>${data.title}</strong>" has been created.
      </p>
      <p style="margin: 0 0 24px; font-size: 24px; color: #00d4ff; font-weight: 600;">
        Total: $${data.total} USDT0
      </p>
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL?.replace('plasma-venmo', 'bill-split') || 'http://localhost:3003'}/bill/${data.billId}" style="${buttonStyle}">View Bill</a>
      </div>
    `),
  },
  bill_share_assigned: {
    subject: (data) => `💰 Your share: $${data.share} USDT0`,
    html: (data) => wrapEmailTemplate(`
      <h2 style="margin: 0 0 16px; font-size: 28px; color: #00d4ff;">💰 Pay Your Share</h2>
      <p style="margin: 0 0 16px; font-size: 16px; color: rgba(255,255,255,0.8);">
        Your share of "<strong>${data.title}</strong>" is:
      </p>
      <p style="margin: 0 0 24px; font-size: 36px; color: #00d4ff; font-weight: 700; text-align: center;">
        $${data.share} USDT0
      </p>
      <div style="text-align: center;">
        <a href="${data.paymentUrl}" style="${buttonStyle}">Pay Now</a>
      </div>
    `),
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

    const subject = template.subject(notificationData);
    const html = template.html(notificationData);
    const toEmail = notification.recipientEmail!;

    // Get Resend client
    const resend = getResend();
    
    if (!resend) {
      // No email provider configured - log and mark as sent (dev mode)
      console.log('📧 Notification (no RESEND_API_KEY configured):');
      console.log('  To:', toEmail);
      console.log('  Subject:', subject);
      console.log('  Type:', notification.type);
      console.log('  Note: Email notifications are optional. Users can share payment links directly.');
      
      await notifyHelpers.markSent(notification.id);
      
      return NextResponse.json({
        success: true,
        message: 'Email not sent (RESEND_API_KEY not configured). Share payment links directly instead.',
        id: notification.id,
      });
    }

    // Send via Resend SDK
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Plenmo <onboarding@resend.dev>';
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject,
      html,
    });

    if (emailError) {
      console.error('[notify] Resend API error:', {
        notificationId: notification.id,
        recipientEmail: toEmail,
        errorName: emailError.name,
        errorMessage: emailError.message,
        fullError: JSON.stringify(emailError),
      });
      await notifyHelpers.markFailed(notification.id, JSON.stringify(emailError));
      return NextResponse.json(
        { 
          error: 'Failed to send email', 
          details: emailError,
          canRetry: true,
          message: 'We couldn\'t send the notification email. Would you like to try again?'
        },
        { status: 500 }
      );
    }

    // Mark as sent
    await notifyHelpers.markSent(notification.id);

    console.log('📧 Email sent via Resend:', {
      id: notification.id,
      to: toEmail,
      resendId: emailData?.id,
    });

    return NextResponse.json({
      success: true,
      id: notification.id,
      provider: 'resend',
      emailId: emailData?.id,
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
      pending: pending.map((n: Notification) => ({
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
