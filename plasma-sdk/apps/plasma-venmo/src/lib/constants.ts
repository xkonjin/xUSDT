/**
 * Application constants
 */

// Amount validation
export const MIN_AMOUNT = 0.01; // Minimum $0.01
export const MAX_AMOUNT = 10000; // Maximum $10,000 per transaction

// Memo validation
export const MAX_MEMO_LENGTH = 200;

// Transaction messages
export const AMOUNT_TOO_SMALL = `Minimum amount is $${MIN_AMOUNT.toFixed(2)}`;
export const AMOUNT_TOO_LARGE = `Maximum amount is $${MAX_AMOUNT.toLocaleString()}`;
export const INSUFFICIENT_BALANCE = "Insufficient balance";
export const MEMO_TOO_LONG = `Memo must be ${MAX_MEMO_LENGTH} characters or less`;

// Relay fee model
export const RELAY_FEE_BPS = 50; // 0.5%
export const MIN_FEE_USDT0 = 0.01;
export const FEE_COLLECTOR_ADDRESS =
  process.env.NEXT_PUBLIC_FEE_COLLECTOR_ADDRESS ||
  process.env.NEXT_PUBLIC_MERCHANT_ADDRESS ||
  "";

// Gas sponsorship limits
export const DAILY_FREE_TX_LIMIT = 10;
export const DAILY_GAS_BUDGET_USD = 1.0;

// Clipboard fallback message
export const CLIPBOARD_FALLBACK =
  "Unable to copy automatically. Please select and copy the text manually.";
