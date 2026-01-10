/**
 * Transaction Types
 *
 * Comprehensive taxonomy of all transaction types in the Plasma SDK.
 * Used for tracking, analytics, and gas sponsorship categorization.
 */

export enum TransactionType {
  // ============================================
  // P2P Payments
  // ============================================
  
  /** Direct wallet-to-wallet transfer */
  SEND_DIRECT = 'send_direct',
  
  /** Send to email (creates claim) */
  SEND_TO_EMAIL = 'send_to_email',
  
  /** Send to phone (creates claim) */
  SEND_TO_PHONE = 'send_to_phone',
  
  /** Send to Telegram user */
  SEND_TO_TELEGRAM = 'send_to_telegram',

  // ============================================
  // Payment Links
  // ============================================
  
  /** Create a shareable payment link */
  PAYMENT_LINK_CREATE = 'payment_link_create',
  
  /** Pay via payment link */
  PAYMENT_LINK_PAY = 'payment_link_pay',

  // ============================================
  // Payment Requests
  // ============================================
  
  /** Create a payment request */
  REQUEST_CREATE = 'request_create',
  
  /** Pay a payment request */
  REQUEST_PAY = 'request_pay',
  
  /** Decline a payment request */
  REQUEST_DECLINE = 'request_decline',

  // ============================================
  // Claims (Pending Payments)
  // ============================================
  
  /** Create a claim for an unregistered user */
  CLAIM_CREATE = 'claim_create',
  
  /** Execute/claim a pending payment */
  CLAIM_EXECUTE = 'claim_execute',
  
  /** Refund an unclaimed payment */
  CLAIM_REFUND = 'claim_refund',
  
  /** Claim expired automatically */
  CLAIM_EXPIRE = 'claim_expire',

  // ============================================
  // Bill Split (Splitzy)
  // ============================================
  
  /** Create a new bill */
  BILL_CREATE = 'bill_create',
  
  /** Pay your share of a bill */
  BILL_SHARE_PAY = 'bill_share_pay',
  
  /** Receive bill split payment */
  BILL_RECEIVE = 'bill_receive',

  // ============================================
  // Streaming Payments (Plasma Stream)
  // ============================================
  
  /** Create a new payment stream */
  STREAM_CREATE = 'stream_create',
  
  /** Withdraw from a stream */
  STREAM_WITHDRAW = 'stream_withdraw',
  
  /** Cancel a stream */
  STREAM_CANCEL = 'stream_cancel',
  
  /** Top up a stream */
  STREAM_TOPUP = 'stream_topup',

  // ============================================
  // SubKiller
  // ============================================
  
  /** Unlock SubKiller Pro */
  SUBKILLER_UNLOCK = 'subkiller_unlock',

  // ============================================
  // Cross-Chain / Bridge
  // ============================================
  
  /** Initiate a cross-chain bridge */
  BRIDGE_INITIATE = 'bridge_initiate',
  
  /** Bridge transaction completed */
  BRIDGE_COMPLETE = 'bridge_complete',
  
  /** Bridge transaction failed */
  BRIDGE_FAIL = 'bridge_fail',

  // ============================================
  // Referral Rewards
  // ============================================
  
  /** Receive referral reward */
  REFERRAL_REWARD = 'referral_reward',

  // ============================================
  // Gas Sponsorship (Internal)
  // ============================================
  
  /** Gas sponsored by relayer */
  GAS_SPONSOR = 'gas_sponsor',

  // ============================================
  // x402 Protocol
  // ============================================
  
  /** x402 invoice payment */
  X402_PAY = 'x402_pay',

  // ============================================
  // Channel Operations
  // ============================================
  
  /** Open payment channel */
  CHANNEL_OPEN = 'channel_open',
  
  /** Top up payment channel */
  CHANNEL_TOPUP = 'channel_topup',
  
  /** Close payment channel */
  CHANNEL_CLOSE = 'channel_close',
  
  /** Settle channel receipts */
  CHANNEL_SETTLE = 'channel_settle',
}

/**
 * Transaction category for grouping
 */
export enum TransactionCategory {
  PAYMENT = 'payment',
  CLAIM = 'claim',
  BILL = 'bill',
  STREAM = 'stream',
  BRIDGE = 'bridge',
  REWARD = 'reward',
  CHANNEL = 'channel',
  SYSTEM = 'system',
}

/**
 * Map transaction types to categories
 */
export const TRANSACTION_CATEGORIES: Record<TransactionType, TransactionCategory> = {
  [TransactionType.SEND_DIRECT]: TransactionCategory.PAYMENT,
  [TransactionType.SEND_TO_EMAIL]: TransactionCategory.PAYMENT,
  [TransactionType.SEND_TO_PHONE]: TransactionCategory.PAYMENT,
  [TransactionType.SEND_TO_TELEGRAM]: TransactionCategory.PAYMENT,
  [TransactionType.PAYMENT_LINK_CREATE]: TransactionCategory.PAYMENT,
  [TransactionType.PAYMENT_LINK_PAY]: TransactionCategory.PAYMENT,
  [TransactionType.REQUEST_CREATE]: TransactionCategory.PAYMENT,
  [TransactionType.REQUEST_PAY]: TransactionCategory.PAYMENT,
  [TransactionType.REQUEST_DECLINE]: TransactionCategory.PAYMENT,
  [TransactionType.CLAIM_CREATE]: TransactionCategory.CLAIM,
  [TransactionType.CLAIM_EXECUTE]: TransactionCategory.CLAIM,
  [TransactionType.CLAIM_REFUND]: TransactionCategory.CLAIM,
  [TransactionType.CLAIM_EXPIRE]: TransactionCategory.CLAIM,
  [TransactionType.BILL_CREATE]: TransactionCategory.BILL,
  [TransactionType.BILL_SHARE_PAY]: TransactionCategory.BILL,
  [TransactionType.BILL_RECEIVE]: TransactionCategory.BILL,
  [TransactionType.STREAM_CREATE]: TransactionCategory.STREAM,
  [TransactionType.STREAM_WITHDRAW]: TransactionCategory.STREAM,
  [TransactionType.STREAM_CANCEL]: TransactionCategory.STREAM,
  [TransactionType.STREAM_TOPUP]: TransactionCategory.STREAM,
  [TransactionType.SUBKILLER_UNLOCK]: TransactionCategory.PAYMENT,
  [TransactionType.BRIDGE_INITIATE]: TransactionCategory.BRIDGE,
  [TransactionType.BRIDGE_COMPLETE]: TransactionCategory.BRIDGE,
  [TransactionType.BRIDGE_FAIL]: TransactionCategory.BRIDGE,
  [TransactionType.REFERRAL_REWARD]: TransactionCategory.REWARD,
  [TransactionType.GAS_SPONSOR]: TransactionCategory.SYSTEM,
  [TransactionType.X402_PAY]: TransactionCategory.PAYMENT,
  [TransactionType.CHANNEL_OPEN]: TransactionCategory.CHANNEL,
  [TransactionType.CHANNEL_TOPUP]: TransactionCategory.CHANNEL,
  [TransactionType.CHANNEL_CLOSE]: TransactionCategory.CHANNEL,
  [TransactionType.CHANNEL_SETTLE]: TransactionCategory.CHANNEL,
};

/**
 * Check if a transaction type is eligible for gas sponsorship
 */
export function isGasSponsoredType(type: TransactionType): boolean {
  const sponsoredTypes: TransactionType[] = [
    TransactionType.SEND_DIRECT,
    TransactionType.SEND_TO_EMAIL,
    TransactionType.SEND_TO_PHONE,
    TransactionType.SEND_TO_TELEGRAM,
    TransactionType.PAYMENT_LINK_PAY,
    TransactionType.REQUEST_PAY,
    TransactionType.CLAIM_EXECUTE,
    TransactionType.BILL_SHARE_PAY,
    TransactionType.STREAM_WITHDRAW,
    TransactionType.X402_PAY,
  ];
  return sponsoredTypes.includes(type);
}

/**
 * Get human-readable label for transaction type
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    [TransactionType.SEND_DIRECT]: 'Send',
    [TransactionType.SEND_TO_EMAIL]: 'Send to Email',
    [TransactionType.SEND_TO_PHONE]: 'Send to Phone',
    [TransactionType.SEND_TO_TELEGRAM]: 'Send via Telegram',
    [TransactionType.PAYMENT_LINK_CREATE]: 'Create Payment Link',
    [TransactionType.PAYMENT_LINK_PAY]: 'Pay Link',
    [TransactionType.REQUEST_CREATE]: 'Request Money',
    [TransactionType.REQUEST_PAY]: 'Pay Request',
    [TransactionType.REQUEST_DECLINE]: 'Decline Request',
    [TransactionType.CLAIM_CREATE]: 'Create Claim',
    [TransactionType.CLAIM_EXECUTE]: 'Claim Payment',
    [TransactionType.CLAIM_REFUND]: 'Refund',
    [TransactionType.CLAIM_EXPIRE]: 'Expired',
    [TransactionType.BILL_CREATE]: 'Create Bill',
    [TransactionType.BILL_SHARE_PAY]: 'Pay Bill Share',
    [TransactionType.BILL_RECEIVE]: 'Receive Bill Payment',
    [TransactionType.STREAM_CREATE]: 'Create Stream',
    [TransactionType.STREAM_WITHDRAW]: 'Withdraw from Stream',
    [TransactionType.STREAM_CANCEL]: 'Cancel Stream',
    [TransactionType.STREAM_TOPUP]: 'Top Up Stream',
    [TransactionType.SUBKILLER_UNLOCK]: 'Unlock SubKiller Pro',
    [TransactionType.BRIDGE_INITIATE]: 'Bridge Started',
    [TransactionType.BRIDGE_COMPLETE]: 'Bridge Complete',
    [TransactionType.BRIDGE_FAIL]: 'Bridge Failed',
    [TransactionType.REFERRAL_REWARD]: 'Referral Reward',
    [TransactionType.GAS_SPONSOR]: 'Gas Sponsored',
    [TransactionType.X402_PAY]: 'API Payment',
    [TransactionType.CHANNEL_OPEN]: 'Open Channel',
    [TransactionType.CHANNEL_TOPUP]: 'Top Up Channel',
    [TransactionType.CHANNEL_CLOSE]: 'Close Channel',
    [TransactionType.CHANNEL_SETTLE]: 'Settle Channel',
  };
  return labels[type] || type;
}
