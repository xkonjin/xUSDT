/**
 * Structured Logger
 * 
 * Provides production-ready structured logging with:
 * - JSON output for log aggregation services
 * - Log levels (debug, info, warn, error)
 * - Correlation IDs for request tracing
 * - Sensitive data redaction
 * - Performance timing
 * 
 * Replaces console.log/warn/error throughout the codebase.
 */

// =============================================================================
// Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Unique request/transaction correlation ID */
  correlationId?: string;
  /** User or wallet address (will be partially redacted) */
  address?: string;
  /** Route or function name */
  route?: string;
  /** HTTP method */
  method?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** Additional context fields */
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  correlationId?: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(defaultContext: LogContext): Logger;
  time(label: string): () => number;
}

// =============================================================================
// Configuration
// =============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SERVICE_NAME = process.env.SERVICE_NAME || 'plenmo';
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';
const JSON_OUTPUT = process.env.LOG_FORMAT === 'json' || ENVIRONMENT === 'production';

// Fields that should be redacted in logs
const SENSITIVE_FIELDS = [
  'privateKey',
  'private_key',
  'secret',
  'password',
  'token',
  'authorization',
  'apiKey',
  'api_key',
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Redact sensitive fields from an object.
 */
function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive field
    if (SENSITIVE_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively redact nested objects
      result[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Partially redact an address for logging.
 * Shows first 6 and last 4 characters.
 */
function redactAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a log entry for output.
 */
function formatLogEntry(entry: LogEntry): string {
  if (JSON_OUTPUT) {
    return JSON.stringify(entry);
  }
  
  // Human-readable format for development
  const timestamp = new Date(entry.timestamp).toISOString();
  const level = entry.level.toUpperCase().padEnd(5);
  const correlationId = entry.correlationId ? `[${entry.correlationId}]` : '';
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  
  return `${timestamp} ${level} ${correlationId} ${entry.message}${context}`;
}

/**
 * Check if a log level should be output.
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

// =============================================================================
// Logger Implementation
// =============================================================================

class StructuredLogger implements Logger {
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) return;

    const mergedContext = { ...this.defaultContext, ...context };
    
    // Redact sensitive data
    const safeContext = redactSensitive(mergedContext as Record<string, unknown>);
    
    // Redact addresses
    if (safeContext.address && typeof safeContext.address === 'string') {
      safeContext.address = redactAddress(safeContext.address);
    }
    if (safeContext.from && typeof safeContext.from === 'string') {
      safeContext.from = redactAddress(safeContext.from);
    }
    if (safeContext.to && typeof safeContext.to === 'string') {
      safeContext.to = redactAddress(safeContext.to);
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: SERVICE_NAME,
      environment: ENVIRONMENT,
      correlationId: mergedContext.correlationId,
      context: Object.keys(safeContext).length > 0 ? safeContext : undefined,
    };

    const output = formatLogEntry(entry);

    // Output to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Create a child logger with additional default context.
   */
  child(additionalContext: LogContext): Logger {
    return new StructuredLogger({
      ...this.defaultContext,
      ...additionalContext,
    });
  }

  /**
   * Start a timer and return a function to stop it.
   * Returns the duration in milliseconds.
   */
  time(label: string): () => number {
    const start = performance.now();
    return () => {
      const duration = Math.round(performance.now() - start);
      this.debug(`${label} completed`, { duration });
      return duration;
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const logger = new StructuredLogger();

/**
 * Create a logger for a specific route/module.
 */
export function createLogger(route: string): Logger {
  return logger.child({ route });
}

// =============================================================================
// Payment-Specific Logging Functions
// =============================================================================

export interface PaymentLogContext {
  correlationId: string;
  from?: string;
  to?: string;
  amount?: string;
  txHash?: string;
  method?: string;
  chain?: string;
  duration?: number;
  error?: string;
  errorCode?: string;
  blockNumber?: string;
  gasUsed?: string;
}

const paymentLogger = createLogger('payment');

/**
 * Log payment initiation.
 */
export function logPaymentInitiated(context: PaymentLogContext): void {
  paymentLogger.info('Payment initiated', {
    correlationId: context.correlationId,
    from: context.from,
    to: context.to,
    amount: context.amount,
    method: context.method,
  });
}

/**
 * Log successful payment.
 */
export function logPaymentSuccess(context: PaymentLogContext): void {
  paymentLogger.info('Payment successful', {
    correlationId: context.correlationId,
    from: context.from,
    to: context.to,
    amount: context.amount,
    txHash: context.txHash,
    blockNumber: context.blockNumber,
    gasUsed: context.gasUsed,
    duration: context.duration,
    method: context.method,
    chain: context.chain,
  });
}

/**
 * Log failed payment.
 */
export function logPaymentFailed(context: PaymentLogContext): void {
  paymentLogger.error('Payment failed', {
    correlationId: context.correlationId,
    from: context.from,
    to: context.to,
    amount: context.amount,
    error: context.error,
    errorCode: context.errorCode,
    duration: context.duration,
  });
}

/**
 * Log payment timeout.
 */
export function logPaymentTimeout(context: PaymentLogContext): void {
  paymentLogger.warn('Payment timeout', {
    correlationId: context.correlationId,
    from: context.from,
    to: context.to,
    amount: context.amount,
    duration: context.duration,
  });
}

// =============================================================================
// Alert Functions (for critical issues)
// =============================================================================

export interface AlertContext {
  correlationId: string;
  error: string;
  errorCode?: string;
  amount?: string;
  from?: string;
  to?: string;
  txHash?: string;
}

/**
 * Send alert for transaction failure.
 * In production, this should integrate with alerting services (PagerDuty, Slack, etc.)
 */
export async function alertTransactionFailed(context: AlertContext): Promise<void> {
  // Log the alert
  logger.error('ALERT: Transaction failed', {
    correlationId: context.correlationId,
    error: context.error,
    errorCode: context.errorCode,
    amount: context.amount,
    from: context.from,
    to: context.to,
    txHash: context.txHash,
  });

  // In production, send to alerting service
  if (ENVIRONMENT === 'production') {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'transaction_failed',
            ...context,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (err) {
        logger.error('Failed to send alert webhook', { error: String(err) });
      }
    }
  }
}

// =============================================================================
// Error Capture (Sentry integration placeholder)
// =============================================================================

/**
 * Capture exception for error tracking.
 * In production, this should integrate with Sentry or similar.
 */
export function captureException(
  error: unknown,
  context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error('Exception captured', {
    error: errorMessage,
    stack: errorStack,
    ...context?.tags,
    ...context?.extra,
  });

  // In production, send to Sentry
  // Sentry.captureException(error, context);
}
