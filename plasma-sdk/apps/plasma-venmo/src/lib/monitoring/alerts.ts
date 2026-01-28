/**
 * Alerting Service for Failed Transactions
 * 
 * Sends alerts via multiple channels when transactions fail.
 * Supports: Slack, Discord, Email (via Resend), and PagerDuty.
 */

import { captureException, captureMessage } from './sentry';

export interface AlertContext {
  correlationId: string;
  error: string;
  errorCode?: string;
  amount?: string;
  from?: string;
  to?: string;
  txHash?: string;
  timestamp: string;
  environment: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

type AlertChannel = 'slack' | 'discord' | 'email' | 'pagerduty';

const ALERT_CONFIG = {
  slack: {
    enabled: !!process.env.SLACK_WEBHOOK_URL,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
  discord: {
    enabled: !!process.env.DISCORD_WEBHOOK_URL,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
  email: {
    enabled: !!process.env.RESEND_API_KEY && !!process.env.ALERT_EMAIL,
    apiKey: process.env.RESEND_API_KEY,
    to: process.env.ALERT_EMAIL,
    from: process.env.RESEND_FROM_EMAIL || 'Plenmo Alerts <alerts@plenmo.app>',
  },
  pagerduty: {
    enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
    routingKey: process.env.PAGERDUTY_ROUTING_KEY,
  },
};

/**
 * Determine alert severity based on error type and amount
 */
export function determineSeverity(error: string, amount?: string): AlertContext['severity'] {
  // Critical: Service configuration issues
  if (error.includes('configuration error') || error.includes('not configured')) {
    return 'critical';
  }
  
  // High: Large transaction failures (>$1000)
  if (amount) {
    const amountNum = parseFloat(amount);
    if (amountNum >= 1000) return 'high';
    if (amountNum >= 100) return 'medium';
  }
  
  // Medium: Common transaction errors
  if (error.includes('reverted') || error.includes('insufficient')) {
    return 'medium';
  }
  
  // Low: Validation errors, user errors
  if (error.includes('Missing required') || error.includes('Invalid')) {
    return 'low';
  }
  
  return 'medium';
}

/**
 * Format alert message for Slack
 */
function formatSlackMessage(context: AlertContext): object {
  const severityEmoji = {
    low: '⚠️',
    medium: '🔶',
    high: '🔴',
    critical: '🚨',
  };
  
  return {
    text: `${severityEmoji[context.severity]} Payment Failed`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[context.severity]} Payment Failure Alert`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Severity:*\n${context.severity.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Environment:*\n${context.environment}` },
          { type: 'mrkdwn', text: `*Amount:*\n${context.amount || 'N/A'} USDT0` },
          { type: 'mrkdwn', text: `*Correlation ID:*\n\`${context.correlationId}\`` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n\`\`\`${context.error}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*From:* ${context.from || 'N/A'}` },
          { type: 'mrkdwn', text: `*To:* ${context.to || 'N/A'}` },
          { type: 'mrkdwn', text: `*Time:* ${context.timestamp}` },
        ],
      },
    ],
  };
}

/**
 * Format alert message for Discord
 */
function formatDiscordMessage(context: AlertContext): object {
  const severityColor = {
    low: 0xffc107,      // Yellow
    medium: 0xff9800,   // Orange
    high: 0xf44336,     // Red
    critical: 0x9c27b0, // Purple
  };
  
  return {
    embeds: [{
      title: '🚨 Payment Failure Alert',
      color: severityColor[context.severity],
      fields: [
        { name: 'Severity', value: context.severity.toUpperCase(), inline: true },
        { name: 'Environment', value: context.environment, inline: true },
        { name: 'Amount', value: `${context.amount || 'N/A'} USDT0`, inline: true },
        { name: 'Correlation ID', value: `\`${context.correlationId}\``, inline: false },
        { name: 'Error', value: `\`\`\`${context.error.slice(0, 1000)}\`\`\``, inline: false },
        { name: 'From', value: context.from || 'N/A', inline: true },
        { name: 'To', value: context.to || 'N/A', inline: true },
      ],
      timestamp: context.timestamp,
      footer: { text: 'Plenmo Monitoring' },
    }],
  };
}

/**
 * Send alert to Slack
 */
async function sendSlackAlert(context: AlertContext): Promise<void> {
  if (!ALERT_CONFIG.slack.enabled || !ALERT_CONFIG.slack.webhookUrl) return;
  
  try {
    const response = await fetch(ALERT_CONFIG.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatSlackMessage(context)),
    });
    
    if (!response.ok) {
      console.error('[Alert] Slack alert failed:', response.status);
    }
  } catch (error) {
    console.error('[Alert] Slack alert error:', error);
  }
}

/**
 * Send alert to Discord
 */
async function sendDiscordAlert(context: AlertContext): Promise<void> {
  if (!ALERT_CONFIG.discord.enabled || !ALERT_CONFIG.discord.webhookUrl) return;
  
  try {
    const response = await fetch(ALERT_CONFIG.discord.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatDiscordMessage(context)),
    });
    
    if (!response.ok) {
      console.error('[Alert] Discord alert failed:', response.status);
    }
  } catch (error) {
    console.error('[Alert] Discord alert error:', error);
  }
}

/**
 * Send alert via email (Resend)
 */
async function sendEmailAlert(context: AlertContext): Promise<void> {
  if (!ALERT_CONFIG.email.enabled) return;
  
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(ALERT_CONFIG.email.apiKey);
    
    await resend.emails.send({
      from: ALERT_CONFIG.email.from!,
      to: ALERT_CONFIG.email.to!,
      subject: `[${context.severity.toUpperCase()}] Plenmo Payment Failed - ${context.environment}`,
      html: `
        <h2>🚨 Payment Failure Alert</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Severity:</strong></td><td>${context.severity.toUpperCase()}</td></tr>
          <tr><td><strong>Environment:</strong></td><td>${context.environment}</td></tr>
          <tr><td><strong>Amount:</strong></td><td>${context.amount || 'N/A'} USDT0</td></tr>
          <tr><td><strong>Correlation ID:</strong></td><td><code>${context.correlationId}</code></td></tr>
          <tr><td><strong>From:</strong></td><td>${context.from || 'N/A'}</td></tr>
          <tr><td><strong>To:</strong></td><td>${context.to || 'N/A'}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${context.timestamp}</td></tr>
        </table>
        <h3>Error Details</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${context.error}</pre>
      `,
    });
  } catch (error) {
    console.error('[Alert] Email alert error:', error);
  }
}

/**
 * Send alert to PagerDuty
 */
async function sendPagerDutyAlert(context: AlertContext): Promise<void> {
  if (!ALERT_CONFIG.pagerduty.enabled || !ALERT_CONFIG.pagerduty.routingKey) return;
  
  // Only page for high/critical severity
  if (context.severity !== 'high' && context.severity !== 'critical') return;
  
  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: ALERT_CONFIG.pagerduty.routingKey,
        event_action: 'trigger',
        dedup_key: context.correlationId,
        payload: {
          summary: `Payment failed: ${context.error.slice(0, 100)}`,
          severity: context.severity === 'critical' ? 'critical' : 'error',
          source: 'plenmo-payments',
          timestamp: context.timestamp,
          custom_details: {
            amount: context.amount,
            from: context.from,
            to: context.to,
            error: context.error,
            correlationId: context.correlationId,
            environment: context.environment,
          },
        },
      }),
    });
    
    if (!response.ok) {
      console.error('[Alert] PagerDuty alert failed:', response.status);
    }
  } catch (error) {
    console.error('[Alert] PagerDuty alert error:', error);
  }
}

/**
 * Send alert for a failed transaction
 */
export async function alertTransactionFailed(params: {
  correlationId: string;
  error: string;
  errorCode?: string;
  amount?: string;
  from?: string;
  to?: string;
  txHash?: string;
}) {
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  
  // Don't alert in development unless explicitly enabled
  if (environment === 'development' && process.env.ALERT_IN_DEV !== 'true') {
    console.log('[Alert] Skipping alert in development:', params);
    return;
  }
  
  const severity = determineSeverity(params.error, params.amount);
  
  const context: AlertContext = {
    ...params,
    timestamp: new Date().toISOString(),
    environment,
    severity,
  };
  
  // Log to Sentry
  captureMessage(
    `Transaction failed: ${params.error}`,
    severity === 'critical' || severity === 'high' ? 'error' : 'warning',
    context as unknown as Record<string, unknown>
  );
  
  // Send alerts in parallel
  await Promise.allSettled([
    sendSlackAlert(context),
    sendDiscordAlert(context),
    sendEmailAlert(context),
    sendPagerDutyAlert(context),
  ]);
  
  console.log(`[Alert] Sent ${severity} alerts for failed transaction:`, params.correlationId);
}

/**
 * Get alert configuration status
 */
export function getAlertConfig(): Record<AlertChannel, boolean> {
  return {
    slack: ALERT_CONFIG.slack.enabled,
    discord: ALERT_CONFIG.discord.enabled,
    email: ALERT_CONFIG.email.enabled,
    pagerduty: ALERT_CONFIG.pagerduty.enabled,
  };
}
