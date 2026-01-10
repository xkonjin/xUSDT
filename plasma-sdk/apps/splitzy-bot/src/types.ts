/**
 * Splitzy Bot Type Definitions
 * 
 * Core types for the Telegram bill splitting bot.
 * Includes types for bills, participants, payment intents, and session management.
 */

import type { Context, SessionFlavor } from 'grammy';

// ============================================================================
// SESSION DATA - Stored per-user conversation state
// ============================================================================

/**
 * Represents a scanned/parsed receipt item
 */
export interface ScannedItem {
  /** Unique identifier for the item within the bill */
  id: string;
  /** Item name/description */
  name: string;
  /** Price per unit */
  price: number;
  /** Quantity ordered */
  quantity: number;
}

/**
 * Receipt scan result from OpenAI Vision
 */
export interface ReceiptScanResult {
  /** Extracted line items */
  items: ScannedItem[];
  /** Subtotal before tax/tip */
  subtotal?: number;
  /** Tax amount */
  tax?: number;
  /** Tax percentage */
  taxPercent?: number;
  /** Tip amount */
  tip?: number;
  /** Tip percentage */
  tipPercent?: number;
  /** Total bill amount */
  total?: number;
  /** Merchant/restaurant name */
  merchant?: string;
  /** Receipt date */
  date?: string;
  /** AI confidence score (0-1) */
  confidence: number;
}

/**
 * Participant in a bill split
 */
export interface BillParticipant {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Telegram username (without @) */
  telegramUsername?: string;
  /** Telegram user ID */
  telegramUserId?: number;
  /** Item IDs assigned to this participant */
  assignedItemIds: string[];
  /** Calculated share amount in USD */
  share: number;
  /** Color for UI display */
  color: string;
}

/**
 * Active bill being created/edited
 */
export interface ActiveBill {
  /** Bill title (usually merchant name) */
  title: string;
  /** Scanned/entered items */
  items: ScannedItem[];
  /** Participants splitting the bill */
  participants: BillParticipant[];
  /** Tax percentage */
  taxPercent: number;
  /** Tip percentage */
  tipPercent: number;
  /** Calculated subtotal */
  subtotal: number;
  /** Calculated tax */
  tax: number;
  /** Calculated tip */
  tip: number;
  /** Calculated total */
  total: number;
  /** Bill creator's wallet address */
  creatorAddress?: string;
}

/**
 * Session data stored for each user
 */
export interface SessionData {
  /** Current conversation step/state */
  step: ConversationStep;
  /** Active bill being created */
  activeBill?: ActiveBill;
  /** User's connected wallet address */
  walletAddress?: string;
  /** Timestamp of last activity */
  lastActivity: number;
}

/**
 * Conversation steps for the bill splitting flow
 */
export type ConversationStep =
  | 'idle'                    // No active flow
  | 'awaiting_receipt'        // Waiting for receipt photo
  | 'confirming_items'        // Confirm scanned items
  | 'entering_split_count'    // How many people splitting?
  | 'entering_participants'   // Adding participant names
  | 'assigning_items'         // Assigning items to people
  | 'confirming_split'        // Review and confirm
  | 'awaiting_wallet'         // Waiting for wallet connection
  | 'generating_qr';          // Generating payment QR codes

// ============================================================================
// GRAMMY CONTEXT TYPE - Extended context with session
// ============================================================================

/**
 * Custom context type with session data
 */
export type BotContext = Context & SessionFlavor<SessionData>;

// ============================================================================
// PAYMENT INTENTS - For cross-chain payments
// ============================================================================

/**
 * Payment intent status
 */
export type PaymentIntentStatus = 
  | 'pending'      // Waiting for payment
  | 'processing'   // Bridge transaction in progress
  | 'completed'    // Payment received
  | 'expired'      // Intent expired
  | 'failed';      // Payment failed

/**
 * Payment intent for a bill split participant
 */
export interface PaymentIntent {
  /** Unique ID (used in QR code/link) */
  id: string;
  /** Related bill ID */
  billId: string;
  /** Participant index in the bill */
  participantIndex: number;
  /** Amount in USD */
  amountUsd: number;
  /** Recipient wallet address (bill creator) */
  recipientAddress: string;
  /** Current status */
  status: PaymentIntentStatus;
  /** Payer's wallet address (filled after payment) */
  payerAddress?: string;
  /** Source chain ID */
  sourceChainId?: number;
  /** Source token address */
  sourceToken?: string;
  /** Source transaction hash */
  sourceTxHash?: string;
  /** Destination transaction hash (on Plasma) */
  destTxHash?: string;
  /** Bridge provider used */
  bridgeProvider?: 'jumper' | 'debridge';
  /** Creation timestamp */
  createdAt: Date;
  /** Payment timestamp */
  paidAt?: Date;
  /** Expiration timestamp */
  expiresAt: Date;
}

// ============================================================================
// TELEGRAM USER WALLET MAPPING
// ============================================================================

/**
 * Mapping of Telegram user to their Plasma wallet
 */
export interface TelegramWallet {
  /** Telegram user ID */
  telegramUserId: number;
  /** Telegram username */
  telegramUsername?: string;
  /** Wallet address on Plasma */
  walletAddress: string;
  /** When the wallet was connected */
  createdAt: Date;
}

// ============================================================================
// QR CODE GENERATION
// ============================================================================

/**
 * Generated QR code data for a payment
 */
export interface PaymentQRCode {
  /** Participant name/label */
  label: string;
  /** Amount to pay */
  amount: number;
  /** Payment URL */
  paymentUrl: string;
  /** QR code as PNG buffer */
  qrCodeBuffer: Buffer;
}

// ============================================================================
// BRIDGE AGGREGATION
// ============================================================================

/**
 * Quote from a bridge provider
 */
export interface BridgeQuote {
  /** Provider name */
  provider: 'jumper' | 'debridge';
  /** Source chain ID */
  fromChainId: number;
  /** Source token address */
  fromToken: string;
  /** Amount to pay (in source token units) */
  fromAmount: string;
  /** Destination chain ID */
  toChainId: number;
  /** Destination token address */
  toToken: string;
  /** Amount to receive */
  toAmount: string;
  /** Minimum amount to receive (with slippage) */
  toAmountMin: string;
  /** Estimated gas cost in USD */
  gasUsd: string;
  /** Estimated time in seconds */
  estimatedTime: number;
  /** Route ID for execution */
  routeId: string;
}

/**
 * Parameters for getting a bridge quote
 */
export interface QuoteParams {
  /** Source chain ID */
  fromChainId: number;
  /** Source token address */
  fromToken: string;
  /** Amount in source token units */
  fromAmount: string;
  /** User's wallet address */
  userAddress: string;
  /** Recipient wallet address */
  recipientAddress: string;
}

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

/**
 * Colors for participants (matching bill-split app)
 */
export const PARTICIPANT_COLORS = [
  '#00d4ff', // Cyan
  '#ff6b6b', // Coral
  '#4ecdc4', // Teal
  '#ffe66d', // Yellow
  '#a855f7', // Purple
  '#22c55e', // Green
  '#f97316', // Orange
  '#ec4899', // Pink
] as const;

/**
 * Default session data
 */
export const DEFAULT_SESSION: SessionData = {
  step: 'idle',
  lastActivity: Date.now(),
};

/**
 * Payment intent expiry time (24 hours)
 */
export const PAYMENT_INTENT_EXPIRY_MS = 24 * 60 * 60 * 1000;

