import { db } from "@plasma-pay/db";
import * as Sentry from "@sentry/nextjs";

/**
 * Audit action types for financial operations.
 */
export enum AuditAction {
  // Payment actions
  PAYMENT_INITIATED = "PAYMENT_INITIATED",
  PAYMENT_COMPLETED = "PAYMENT_COMPLETED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  
  // Transfer actions
  TRANSFER_INITIATED = "TRANSFER_INITIATED",
  TRANSFER_COMPLETED = "TRANSFER_COMPLETED",
  TRANSFER_FAILED = "TRANSFER_FAILED",
  
  // Claim actions
  CLAIM_CREATED = "CLAIM_CREATED",
  CLAIM_EXECUTED = "CLAIM_EXECUTED",
  CLAIM_EXPIRED = "CLAIM_EXPIRED",
  
  // Auth actions
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  
  // Admin actions
  ADMIN_ACTION = "ADMIN_ACTION",
  CONFIG_CHANGED = "CONFIG_CHANGED",
}

/**
 * Audit log entry interface.
 */
interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  walletAddress?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Sanitizes metadata to remove sensitive information.
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['privateKey', 'secret', 'password', 'token', 'apiKey'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Creates an audit log entry for compliance tracking.
 * 
 * @param entry The audit log entry data
 * @returns The created audit log record or null if failed
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const sanitizedMetadata = entry.metadata ? sanitizeMetadata(entry.metadata) : {};
    
    // Log to database if audit_logs table exists
    // For now, log to console in structured format
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: entry.action,
      userId: entry.userId || 'anonymous',
      walletAddress: entry.walletAddress,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      metadata: sanitizedMetadata,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };
    
    // In production, this would write to a dedicated audit table
    if (process.env.NODE_ENV === 'production') {
      // Send to external audit service or database
      console.log('[AUDIT]', JSON.stringify(logEntry));
    } else {
      console.log('[AUDIT]', logEntry);
    }
    
    // Also track in Sentry for correlation
    Sentry.addBreadcrumb({
      category: 'audit',
      message: entry.action,
      level: 'info',
      data: {
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
      },
    });
  } catch (error) {
    // Audit logging should never break the main flow
    Sentry.captureException(error);
    console.error('[AUDIT ERROR]', error);
  }
}

/**
 * Creates an audit log for payment operations.
 */
export async function auditPayment(
  action: AuditAction,
  userId: string,
  paymentId: string,
  amount: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    action,
    userId,
    resourceType: 'payment',
    resourceId: paymentId,
    metadata: {
      amount,
      ...metadata,
    },
  });
}

/**
 * Creates an audit log for transfer operations.
 */
export async function auditTransfer(
  action: AuditAction,
  userId: string,
  transferId: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLog({
    action,
    userId,
    resourceType: 'transfer',
    resourceId: transferId,
    metadata: {
      fromAddress,
      toAddress,
      amount,
      ...metadata,
    },
  });
}
