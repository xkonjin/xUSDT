/**
 * SMS Sharing Utilities
 *
 * Generate SMS share links for mobile devices.
 */

export interface SMSShareOptions {
  body: string;
  phone?: string;
}

/**
 * Generate an SMS URL (works on mobile)
 */
export function generateSMSUrl(options: SMSShareOptions): string {
  const { body, phone } = options;

  // Use different separators for iOS vs Android
  // iOS uses & or ?, Android uses ?
  // We'll use ? which works on both modern platforms
  const separator = '?';

  if (phone) {
    return `sms:${phone}${separator}body=${encodeURIComponent(body)}`;
  }

  return `sms:${separator}body=${encodeURIComponent(body)}`;
}

/**
 * Format a payment request for SMS
 */
export function formatSMSPaymentMessage(options: {
  amount: number;
  recipientName?: string;
  payUrl: string;
}): string {
  const { amount, recipientName, payUrl } = options;

  let message = '';

  if (recipientName) {
    message += `${recipientName} requests $${amount.toFixed(2)}. `;
  } else {
    message += `Payment request for $${amount.toFixed(2)}. `;
  }

  message += `Pay here: ${payUrl}`;

  return message;
}

/**
 * Format a bill split for SMS
 */
export function formatSMSBillMessage(options: {
  yourShare: number;
  billTitle: string;
  payUrl: string;
}): string {
  const { yourShare, billTitle, payUrl } = options;

  return `Your share for "${billTitle}" is $${yourShare.toFixed(2)}. Pay here: ${payUrl}`;
}

/**
 * Format an invite for SMS
 */
export function formatSMSInviteMessage(options: {
  referralUrl: string;
  referrerName?: string;
}): string {
  const { referralUrl, referrerName } = options;

  if (referrerName) {
    return `${referrerName} invited you to Plasma Pay - send money instantly with zero fees! Join: ${referralUrl}`;
  }

  return `Try Plasma Pay - send money instantly with zero fees! Join: ${referralUrl}`;
}
