/**
 * Application constants
 */

// Amount validation
export const MIN_AMOUNT = 0.01; // Minimum $0.01 USDT0
export const MAX_AMOUNT = 10000; // Maximum $10,000 USDT0 per transaction

// Memo validation
export const MAX_MEMO_LENGTH = 200;

// Transaction messages
export const AMOUNT_TOO_SMALL = `Minimum amount is $${MIN_AMOUNT.toFixed(2)} USDT0`;
export const AMOUNT_TOO_LARGE = `Maximum amount is $${MAX_AMOUNT.toLocaleString()} USDT0`;
export const MEMO_TOO_LONG = `Memo must be ${MAX_MEMO_LENGTH} characters or less`;

// Clipboard fallback message
export const CLIPBOARD_FALLBACK = "Unable to copy automatically. Please select and copy the text manually.";
