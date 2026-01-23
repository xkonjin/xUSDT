/**
 * User-Friendly Error Utilities
 *
 * Provides functions to convert technical errors into user-friendly messages
 * with actionable next steps. This ensures users see helpful messages instead
 * of cryptic technical errors.
 *
 * @module
 */

/**
 * Context for error messages - provides information about what operation was happening
 */
export interface ErrorContext {
  /** The type of operation being performed */
  operation?: 'payment' | 'bet_placement' | 'transfer' | 'funding' | 'claim';
  /** Amount involved in the operation (for payment/transfer contexts) */
  amount?: string | number;
  /** User's current balance (for insufficient balance errors) */
  balance?: string | number;
  /** Recipient information (for payment contexts) */
  recipient?: string;
}

/**
 * Error categories for mapping technical errors to user-friendly messages
 */
type ErrorCategory =
  | 'insufficient_balance'
  | 'invalid_address'
  | 'network_error'
  | 'transaction_reverted'
  | 'timeout'
  | 'user_rejected'
  | 'invalid_signature'
  | 'rate_limited'
  | 'service_unavailable'
  | 'unknown';

/**
 * Gets the error category based on the error message content
 */
function categorizeError(error: string): ErrorCategory {
  const lowerError = error.toLowerCase();

  // Insufficient balance
  if (
    lowerError.includes('insufficient') ||
    lowerError.includes('exceeds balance') ||
    lowerError.includes('not enough funds') ||
    lowerError.includes('underflow') ||
    (lowerError.includes('erc20') && lowerError.includes('transfer'))
  ) {
    return 'insufficient_balance';
  }

  // Invalid address
  if (
    lowerError.includes('invalid address') ||
    lowerError.includes('bad address') ||
    lowerError.includes('address mismatch')
  ) {
    return 'invalid_address';
  }

  // Network errors
  if (
    lowerError.includes('network') ||
    lowerError.includes('connection') ||
    lowerError.includes('fetch') ||
    lowerError.includes('etimedout') ||
    lowerError.includes('enotfound')
  ) {
    return 'network_error';
  }

  // Transaction reverted
  if (
    lowerError.includes('revert') ||
    lowerError.includes('execution reverted') ||
    lowerError.includes('contract function') ||
    lowerError.includes('vm error')
  ) {
    return 'transaction_reverted';
  }

  // Timeout
  if (
    lowerError.includes('timeout') ||
    lowerError.includes('timed out') ||
    lowerError.includes('request timeout')
  ) {
    return 'timeout';
  }

  // User rejected
  if (
    lowerError.includes('rejected') ||
    lowerError.includes('denied') ||
    lowerError.includes('cancelled') ||
    lowerError.includes('canceled') ||
    lowerError.includes('user denied')
  ) {
    return 'user_rejected';
  }

  // Invalid signature
  if (
    lowerError.includes('signature') &&
    (lowerError.includes('invalid') || lowerError.includes('recovered'))
  ) {
    return 'invalid_signature';
  }

  // Rate limited
  if (
    lowerError.includes('rate limit') ||
    lowerError.includes('too many requests') ||
    lowerError.includes('429')
  ) {
    return 'rate_limited';
  }

  // Service unavailable
  if (
    lowerError.includes('503') ||
    lowerError.includes('502') ||
    lowerError.includes('504') ||
    lowerError.includes('maintenance') ||
    lowerError.includes('not configured') ||
    lowerError.includes('configuration')
  ) {
    return 'service_unavailable';
  }

  return 'unknown';
}

/**
 * Gets a user-friendly message for an error category
 */
function getFriendlyMessage(category: ErrorCategory, context?: ErrorContext): string {
  switch (category) {
    case 'insufficient_balance':
      if (context?.amount && context?.balance) {
        return `You don't have enough funds. You need $${context.amount} but only have $${context.balance}.`;
      }
      return "You don't have enough funds. Please add more money to your wallet.";

    case 'invalid_address':
      if (context?.recipient) {
        return `The recipient address "${context.recipient}" appears to be invalid. Please check it and try again.`;
      }
      return "Please check the recipient address and try again.";

    case 'network_error':
      return "Connection issue. Please check your internet and try again.";

    case 'transaction_reverted':
      return "The transaction couldn't be completed. This may be due to network conditions. Please try again.";

    case 'timeout':
      return "Request timed out. Please try again.";

    case 'user_rejected':
      return "Transaction was cancelled.";

    case 'invalid_signature':
      return "Something went wrong signing the transaction. Please try again.";

    case 'rate_limited':
      return "Too many requests. Please wait a moment and try again.";

    case 'service_unavailable':
      return "This feature is currently unavailable. Please try again later.";

    case 'unknown':
      return "Something went wrong. Please try again.";

    default:
      return "Something went wrong. Please try again.";
  }
}

/**
 * Gets a recovery suggestion for an error category
 */
function getRecoverySuggestion(category: ErrorCategory, context?: ErrorContext): string | undefined {
  switch (category) {
    case 'insufficient_balance':
      if (context?.operation === 'payment') {
        return "Add funds to your wallet to complete this payment.";
      }
      return "Add funds to your wallet using the options below.";

    case 'invalid_address':
      if (context?.operation === 'payment') {
        return "Double-check you have the correct recipient email, phone, or wallet address.";
      }
      return "Verify the address is correct and try again.";

    case 'network_error':
      return "Check your internet connection and make sure you're not in airplane mode.";

    case 'transaction_reverted':
      return "This might be a temporary issue. Please try again in a moment.";

    case 'timeout':
      return "The network might be busy. Please try again.";

    case 'user_rejected':
      return undefined; // No recovery needed for user cancellation

    case 'invalid_signature':
      return "Please refresh the page and try again.";

    case 'rate_limited':
      return "Please wait about 30 seconds before trying again.";

    case 'service_unavailable':
      return "Our team has been notified. Please check back later.";

    case 'unknown':
      return "If this problem persists, please contact support.";

    default:
      return undefined;
  }
}

/**
 * Extracts the error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; error?: string; data?: string | { message?: string } };
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (typeof err.data === 'string') return err.data;
    if (typeof err.data === 'object' && err.data?.message) return err.data.message;
  }

  return 'Unknown error';
}

/**
 * Converts a technical error into a user-friendly message
 *
 * @param error - The error to convert (can be string, Error object, or unknown)
 * @param context - Optional context about what operation was happening
 * @returns A user-friendly error message
 *
 * @example
 * ```ts
 * import { getUserFriendlyError } from '@plasma-pay/ui/lib/user-errors';
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const message = getUserFriendlyError(error, { operation: 'payment', amount: 10, balance: 5 });
 *   // Shows: "You don't have enough funds. You need $10 but only have $5."
 * }
 * ```
 */
export function getUserFriendlyError(error: unknown, context?: ErrorContext): string {
  const errorMessage = extractErrorMessage(error);
  const category = categorizeError(errorMessage);
  return getFriendlyMessage(category, context);
}

/**
 * Gets a detailed error with both a friendly message and recovery suggestion
 *
 * @param error - The error to convert
 * @param context - Optional context about what operation was happening
 * @returns An object with the friendly message and optional recovery suggestion
 *
 * @example
 * ```ts
 * import { getErrorDetails } from '@plasma-pay/ui/lib/user-errors';
 *
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const { message, recovery } = getErrorDetails(error, { operation: 'payment' });
 *   setError(message);
 *   setRecovery(recovery);
 * }
 * ```
 */
export function getErrorDetails(error: unknown, context?: ErrorContext): {
  message: string;
  recovery?: string;
  category: ErrorCategory;
} {
  const errorMessage = extractErrorMessage(error);
  const category = categorizeError(errorMessage);
  const message = getFriendlyMessage(category, context);
  const recovery = getRecoverySuggestion(category, context);

  return { message, recovery, category };
}

/**
 * Checks if an error is recoverable (i.e., user can retry)
 *
 * @param error - The error to check
 * @returns true if the error is recoverable by retrying
 */
export function isRecoverableError(error: unknown): boolean {
  const errorMessage = extractErrorMessage(error);
  const category = categorizeError(errorMessage);

  // These errors are recoverable by simply retrying
  const recoverableCategories: ErrorCategory[] = [
    'network_error',
    'timeout',
    'transaction_reverted',
    'rate_limited',
    'service_unavailable',
  ];

  return recoverableCategories.includes(category);
}

/**
 * Checks if an error is user-caused (user rejected or invalid input)
 *
 * @param error - The error to check
 * @returns true if the error was caused by user action
 */
export function isUserCausedError(error: unknown): boolean {
  const errorMessage = extractErrorMessage(error);
  const category = categorizeError(errorMessage);

  const userCausedCategories: ErrorCategory[] = [
    'user_rejected',
    'invalid_address',
    'insufficient_balance',
  ];

  return userCausedCategories.includes(category);
}
