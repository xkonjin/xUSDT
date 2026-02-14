/**
 * Structured Logger
 * Production-ready logging without external dependencies
 * Outputs JSON-formatted logs for easy parsing
 */

import { randomUUID } from 'crypto';

/**
 * Log levels with numeric priority
 */
export const LogLevel = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  userId?: string;
  env?: string;
  appName?: string;
  [key: string]: unknown;
}

/**
 * Sensitive fields to redact
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'creditCard',
  'credit_card',
  'ssn',
  'cvv'
];

/**
 * Redact sensitive data from objects
 */
function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactSensitive);
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        result[key] = redactSensitive(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  
  return obj;
}

/**
 * Get current log level from environment
 */
function getCurrentLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
  switch (level) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'FATAL': return LogLevel.FATAL;
    default: return LogLevel.INFO;
  }
}

/**
 * Format log entry as JSON string
 */
function formatLog(entry: LogEntry): string {
  const redacted = redactSensitive(entry) as LogEntry;
  return JSON.stringify(redacted);
}

/**
 * Logger context for request tracking
 */
interface LoggerContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

/**
 * Create a logger instance with optional context
 */
class Logger {
  private context: LoggerContext;
  private minLevel: LogLevel;
  
  constructor(context: LoggerContext = {}) {
    this.context = {
      env: process.env.NODE_ENV || 'development',
      appName: 'xUSDT/Plenmo',
      ...context
    };
    this.minLevel = getCurrentLogLevel();
  }
  
  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LoggerContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
  
  /**
   * Internal log method
   */
  private log(level: LogLevel, levelName: string, message: string, data?: Record<string, unknown>): void {
    if (level < this.minLevel) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      requestId: randomUUID(),
      ...this.context,
      ...data
    };
    
    const output = formatLog(entry);
    
    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }
  
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }
  
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }
  
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }
  
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }
  
  fatal(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, 'FATAL', message, data);
  }
}

/**
 * Default logger instance
 */
const logger = new Logger();

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId?: string, userId?: string): Logger {
  return new Logger({
    requestId: requestId || randomUUID(),
    userId
  });
}

/**
 * Generate a new request ID
 */
export function generateRequestId(): string {
  return randomUUID();
}

export default logger;
