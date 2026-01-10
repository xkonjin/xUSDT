/**
 * WhatsApp Sharing Utilities
 *
 * Generate WhatsApp share links and format messages.
 */

export interface WhatsAppShareOptions {
  text: string;
  phone?: string; // Optional specific phone number
}

/**
 * Generate a WhatsApp share URL
 */
export function generateWhatsAppUrl(options: WhatsAppShareOptions): string {
  const { text, phone } = options;
  const encodedText = encodeURIComponent(text);

  if (phone) {
    // Remove any non-numeric characters from phone
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }

  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Generate a payment request message for WhatsApp
 */
export function formatPaymentRequestMessage(options: {
  amount: number;
  currency?: string;
  recipientName?: string;
  memo?: string;
  payUrl: string;
}): string {
  const { amount, currency = 'USDT', recipientName, memo, payUrl } = options;

  let message = `💸 Payment Request\n\n`;

  if (recipientName) {
    message += `From: ${recipientName}\n`;
  }

  message += `Amount: $${amount.toFixed(2)} ${currency}\n`;

  if (memo) {
    message += `For: ${memo}\n`;
  }

  message += `\n🔗 Pay securely: ${payUrl}`;
  message += `\n\n✨ Powered by Plasma Pay - Zero fees, instant transfers`;

  return message;
}

/**
 * Generate a bill split invitation for WhatsApp
 */
export function formatBillSplitMessage(options: {
  billTitle: string;
  totalAmount: number;
  yourShare: number;
  currency?: string;
  payUrl: string;
  creatorName?: string;
}): string {
  const { billTitle, totalAmount, yourShare, currency = 'USDT', payUrl, creatorName } = options;

  let message = `🧾 Bill Split Request\n\n`;
  message += `📋 ${billTitle}\n`;
  message += `💰 Total: $${totalAmount.toFixed(2)} ${currency}\n`;
  message += `👤 Your share: $${yourShare.toFixed(2)} ${currency}\n`;

  if (creatorName) {
    message += `\nFrom: ${creatorName}\n`;
  }

  message += `\n🔗 Pay your share: ${payUrl}`;
  message += `\n\n✨ Split bills instantly with Splitzy`;

  return message;
}

/**
 * Generate a referral/invite message for WhatsApp
 */
export function formatInviteMessage(options: {
  referralUrl: string;
  referrerName?: string;
  reward?: number;
}): string {
  const { referralUrl, referrerName, reward } = options;

  let message = `🎉 Join Plasma Pay!\n\n`;

  if (referrerName) {
    message += `${referrerName} invited you to try Plasma Pay.\n\n`;
  }

  message += `✅ Send money instantly - zero fees\n`;
  message += `✅ Split bills with friends\n`;
  message += `✅ Stream salary payments\n`;

  if (reward) {
    message += `\n🎁 Sign up and get $${reward.toFixed(2)} free!\n`;
  }

  message += `\n🔗 ${referralUrl}`;

  return message;
}

/**
 * Generate a savings share message for WhatsApp (SubKiller)
 */
export function formatSavingsShareMessage(options: {
  monthlySavings: number;
  subscriptionsCancelled: number;
  appUrl: string;
}): string {
  const { monthlySavings, subscriptionsCancelled, appUrl } = options;

  let message = `🎯 I just saved $${monthlySavings.toFixed(2)}/month!\n\n`;
  message += `Cancelled ${subscriptionsCancelled} subscription${subscriptionsCancelled !== 1 ? 's' : ''} `;
  message += `I was wasting money on.\n\n`;
  message += `Find out what you're wasting: ${appUrl}\n\n`;
  message += `#SubKiller #SavingMoney`;

  return message;
}
