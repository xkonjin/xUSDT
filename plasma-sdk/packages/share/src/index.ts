// Short code generation
export {
  generateShortCode,
  generateReferralCode,
  isValidShortCode,
} from './short-codes';

// WhatsApp sharing
export {
  generateWhatsAppUrl,
  formatPaymentRequestMessage,
  formatBillSplitMessage,
  formatInviteMessage,
  formatSavingsShareMessage,
  type WhatsAppShareOptions,
} from './whatsapp';

// Telegram sharing
export {
  generateTelegramShareUrl,
  generateBotDeepLink,
  generateMiniAppUrl,
  formatTelegramPaymentMessage,
  formatTelegramBillMessage,
  formatTelegramInviteMessage,
  parseTelegramInitData,
  type TelegramShareOptions,
  type TelegramUser,
} from './telegram';

// SMS sharing
export {
  generateSMSUrl,
  formatSMSPaymentMessage,
  formatSMSBillMessage,
  formatSMSInviteMessage,
  type SMSShareOptions,
} from './sms';

// Deep links
export {
  generateWebDeepLink,
  generateAppDeepLink,
  generateUniversalLink,
  parseDeepLink,
  createShareUrl,
  type DeepLinkType,
  type DeepLinkParams,
} from './deep-links';

// Native share API
export {
  isNativeShareSupported,
  isFileShareSupported,
  nativeShare,
  nativeShareWithFiles,
  copyToClipboard,
  getAvailableShareChannels,
  type NativeShareData,
} from './native-share';

// Unified share function
export type ShareChannel = 'whatsapp' | 'telegram' | 'sms' | 'email' | 'twitter' | 'copy' | 'native';

export interface ShareOptions {
  channel: ShareChannel;
  title?: string;
  text: string;
  url: string;
  phone?: string;
}

/**
 * Share content via specified channel
 */
export async function share(options: ShareOptions): Promise<{ success: boolean; channel: ShareChannel }> {
  const { channel, title, text, url, phone } = options;

  switch (channel) {
    case 'whatsapp': {
      const { generateWhatsAppUrl } = await import('./whatsapp');
      const whatsappUrl = generateWhatsAppUrl({ text: `${text}\n\n${url}`, phone });
      window.open(whatsappUrl, '_blank');
      return { success: true, channel };
    }

    case 'telegram': {
      const { generateTelegramShareUrl } = await import('./telegram');
      const telegramUrl = generateTelegramShareUrl({ text, url });
      window.open(telegramUrl, '_blank');
      return { success: true, channel };
    }

    case 'sms': {
      const { generateSMSUrl } = await import('./sms');
      const smsUrl = generateSMSUrl({ body: `${text} ${url}`, phone });
      window.location.href = smsUrl;
      return { success: true, channel };
    }

    case 'email': {
      const subject = encodeURIComponent(title || 'Check this out');
      const body = encodeURIComponent(`${text}\n\n${url}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      return { success: true, channel };
    }

    case 'twitter': {
      const tweetText = encodeURIComponent(`${text} ${url}`);
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
      return { success: true, channel };
    }

    case 'copy': {
      const { copyToClipboard } = await import('./native-share');
      const success = await copyToClipboard(url);
      return { success, channel };
    }

    case 'native': {
      const { nativeShare } = await import('./native-share');
      const success = await nativeShare({ title, text, url });
      return { success, channel };
    }

    default:
      return { success: false, channel };
  }
}
