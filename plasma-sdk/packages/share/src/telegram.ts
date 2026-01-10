/**
 * Telegram Sharing Utilities
 *
 * Generate Telegram share links and bot commands.
 */

export interface TelegramShareOptions {
  text: string;
  url?: string;
}

/**
 * Generate a Telegram share URL
 */
export function generateTelegramShareUrl(options: TelegramShareOptions): string {
  const { text, url } = options;

  if (url) {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }

  return `https://t.me/share/url?text=${encodeURIComponent(text)}`;
}

/**
 * Generate a Telegram bot deep link
 */
export function generateBotDeepLink(options: {
  botUsername: string;
  startParam?: string;
}): string {
  const { botUsername, startParam } = options;

  if (startParam) {
    return `https://t.me/${botUsername}?start=${encodeURIComponent(startParam)}`;
  }

  return `https://t.me/${botUsername}`;
}

/**
 * Generate a Telegram Mini App URL
 */
export function generateMiniAppUrl(options: {
  botUsername: string;
  appName?: string;
  startParam?: string;
}): string {
  const { botUsername, appName, startParam } = options;

  let url = `https://t.me/${botUsername}`;

  if (appName) {
    url += `/${appName}`;
  }

  if (startParam) {
    url += `?startapp=${encodeURIComponent(startParam)}`;
  }

  return url;
}

/**
 * Format a payment request for Telegram
 */
export function formatTelegramPaymentMessage(options: {
  amount: number;
  currency?: string;
  recipientName?: string;
  memo?: string;
  payUrl: string;
}): string {
  const { amount, currency = 'USDT', recipientName, memo, payUrl } = options;

  let message = `💸 *Payment Request*\n\n`;

  if (recipientName) {
    message += `From: ${recipientName}\n`;
  }

  message += `Amount: *$${amount.toFixed(2)} ${currency}*\n`;

  if (memo) {
    message += `For: ${memo}\n`;
  }

  message += `\n[Pay Now](${payUrl})`;

  return message;
}

/**
 * Format a bill split for Telegram
 */
export function formatTelegramBillMessage(options: {
  billTitle: string;
  totalAmount: number;
  yourShare: number;
  currency?: string;
  payUrl: string;
}): string {
  const { billTitle, totalAmount, yourShare, currency = 'USDT', payUrl } = options;

  let message = `🧾 *Bill Split*\n\n`;
  message += `📋 ${billTitle}\n`;
  message += `💰 Total: $${totalAmount.toFixed(2)}\n`;
  message += `👤 Your share: *$${yourShare.toFixed(2)} ${currency}*\n\n`;
  message += `[Pay Your Share](${payUrl})`;

  return message;
}

/**
 * Format an invite message for Telegram
 */
export function formatTelegramInviteMessage(options: {
  referralUrl: string;
  referrerName?: string;
  reward?: number;
}): string {
  const { referralUrl, referrerName, reward } = options;

  let message = `🎉 *Join Plasma Pay!*\n\n`;

  if (referrerName) {
    message += `${referrerName} invited you!\n\n`;
  }

  message += `✅ Instant transfers - zero fees\n`;
  message += `✅ Split bills easily\n`;
  message += `✅ Stream payments\n`;

  if (reward) {
    message += `\n🎁 Get *$${reward.toFixed(2)}* when you sign up!\n`;
  }

  message += `\n[Join Now](${referralUrl})`;

  return message;
}

/**
 * Parse Telegram WebApp init data
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function parseTelegramInitData(initData: string): {
  user?: TelegramUser;
  auth_date?: number;
  hash?: string;
  start_param?: string;
} | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    const user = userStr ? JSON.parse(userStr) : undefined;

    return {
      user,
      auth_date: params.get('auth_date') ? parseInt(params.get('auth_date')!) : undefined,
      hash: params.get('hash') || undefined,
      start_param: params.get('start_param') || undefined,
    };
  } catch {
    return null;
  }
}
