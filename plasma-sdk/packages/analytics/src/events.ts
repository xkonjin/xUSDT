/**
 * Plasma SDK Event Taxonomy
 *
 * Standardized event names for tracking across all Plasma apps.
 * Use these constants to ensure consistent analytics.
 */

export const PlasmaEvents = {
  // User Lifecycle
  WALLET_CREATED: 'wallet_created',
  WALLET_CONNECTED: 'wallet_connected',
  WALLET_DISCONNECTED: 'wallet_disconnected',
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',

  // Payments
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SIGNED: 'payment_signed',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',

  // Payment Links
  PAYMENT_LINK_CREATED: 'payment_link_created',
  PAYMENT_LINK_VIEWED: 'payment_link_viewed',
  PAYMENT_LINK_PAID: 'payment_link_paid',

  // Payment Requests
  REQUEST_CREATED: 'request_created',
  REQUEST_VIEWED: 'request_viewed',
  REQUEST_PAID: 'request_paid',
  REQUEST_DECLINED: 'request_declined',

  // Claims
  CLAIM_CREATED: 'claim_created',
  CLAIM_LINK_SENT: 'claim_link_sent',
  CLAIM_VIEWED: 'claim_viewed',
  CLAIM_EXECUTED: 'claim_executed',
  CLAIM_EXPIRED: 'claim_expired',

  // Bill Split (Splitzy)
  BILL_CREATED: 'bill_created',
  RECEIPT_SCANNED: 'receipt_scanned',
  RECEIPT_SCAN_FAILED: 'receipt_scan_failed',
  BILL_ITEM_ASSIGNED: 'bill_item_assigned',
  BILL_SHARED: 'bill_shared',
  BILL_SHARE_PAID: 'bill_share_paid',
  BILL_COMPLETED: 'bill_completed',

  // Streaming (Plasma Stream)
  STREAM_CREATED: 'stream_created',
  STREAM_WITHDRAWN: 'stream_withdrawn',
  STREAM_CANCELLED: 'stream_cancelled',

  // SubKiller
  SUBSCRIPTION_SCANNED: 'subscription_scanned',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBKILLER_UNLOCKED: 'subkiller_unlocked',
  SAVINGS_CALCULATED: 'savings_calculated',

  // Viral / Sharing
  SHARE_LINK_CREATED: 'share_link_created',
  SHARE_LINK_CLICKED: 'share_link_clicked',
  SHARE_INITIATED: 'share_initiated',
  SHARE_COMPLETED: 'share_completed',
  SHARE_CANCELLED: 'share_cancelled',

  // Referrals
  INVITE_SENT: 'invite_sent',
  REFERRAL_LINK_CREATED: 'referral_link_created',
  REFERRAL_LINK_CLICKED: 'referral_link_clicked',
  REFERRAL_SIGNED_UP: 'referral_signed_up',
  REFERRAL_CONVERTED: 'referral_converted',
  REFERRAL_REWARD_EARNED: 'referral_reward_earned',
  REFERRAL_REWARD_PAID: 'referral_reward_paid',

  // Engagement
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  TAB_SWITCHED: 'tab_switched',
  FEATURE_DISCOVERED: 'feature_discovered',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
  TRANSACTION_REVERTED: 'transaction_reverted',
  API_ERROR: 'api_error',

  // Cross-chain
  BRIDGE_INITIATED: 'bridge_initiated',
  BRIDGE_COMPLETED: 'bridge_completed',
  BRIDGE_FAILED: 'bridge_failed',

  // Telegram
  TELEGRAM_BOT_STARTED: 'telegram_bot_started',
  TELEGRAM_WEBAPP_OPENED: 'telegram_webapp_opened',
  TELEGRAM_PAYMENT_INITIATED: 'telegram_payment_initiated',

  // Gas Sponsorship
  GAS_SPONSORED: 'gas_sponsored',
  GAS_SPONSORSHIP_LIMIT_REACHED: 'gas_sponsorship_limit_reached',
} as const;

export type PlasmaEventName = (typeof PlasmaEvents)[keyof typeof PlasmaEvents];

// Event property types for type-safe tracking
export interface PaymentEventProperties {
  amount: number;
  currency: string;
  recipient_type: 'wallet' | 'email' | 'phone' | 'telegram';
  network: 'plasma' | 'ethereum';
  is_gasless: boolean;
  tx_hash?: string;
}

export interface ShareEventProperties {
  channel: 'whatsapp' | 'telegram' | 'sms' | 'email' | 'copy' | 'native';
  content_type: 'payment_link' | 'bill' | 'referral' | 'savings';
  link_id?: string;
}

export interface ReferralEventProperties {
  referrer_address: string;
  referee_address?: string;
  reward_amount?: number;
  source: 'app' | 'web' | 'telegram' | 'whatsapp';
}

export interface BillEventProperties {
  bill_id: string;
  total_amount: number;
  item_count: number;
  participant_count: number;
  has_receipt_image: boolean;
}

export interface ErrorEventProperties {
  error_code: string;
  error_message: string;
  component: string;
  action: string;
}
