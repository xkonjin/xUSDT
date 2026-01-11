/**
 * Retry utility for failed transactions and API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryOn?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryOn: () => true, // Retry all errors by default
};

/**
 * Check if an error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors
  if (message.includes('network') || message.includes('fetch')) return true;
  if (message.includes('timeout') || message.includes('timed out')) return true;
  if (message.includes('connection') || message.includes('disconnected')) return true;
  
  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503')) return true;
  if (message.includes('server error') || message.includes('internal error')) return true;
  
  // Rate limiting (can retry after delay)
  if (message.includes('rate limit') || message.includes('too many requests')) return true;
  if (message.includes('429')) return true;
  
  // NOT retryable - permanent errors
  if (message.includes('insufficient') || message.includes('balance')) return false;
  if (message.includes('invalid') || message.includes('rejected')) return false;
  if (message.includes('unauthorized') || message.includes('forbidden')) return false;
  if (message.includes('not found') || message.includes('404')) return false;
  
  // Default: retry unknown errors
  return true;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry on failure
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.retryOn(lastError)) {
        throw lastError;
      }
      
      // Wait before retrying
      await sleep(delay);
      
      // Increase delay with exponential backoff
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
): (...args: T) => Promise<R> {
  return (...args: T) => withRetry(() => fn(...args), options);
}

/**
 * Retry state for UI components
 */
export interface RetryState {
  attempt: number;
  maxAttempts: number;
  isRetrying: boolean;
  lastError: string | null;
}

export const initialRetryState: RetryState = {
  attempt: 0,
  maxAttempts: 3,
  isRetrying: false,
  lastError: null,
};
