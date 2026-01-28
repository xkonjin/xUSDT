/**
 * Production Utilities Index
 * 
 * This module exports all production-grade utilities for the xUSDT/Plenmo app.
 * These utilities provide security, monitoring, and performance enhancements.
 */

// API Authentication and Security
export {
  withAuth,
  verifyAuth,
  verifyCsrf,
  generateCsrfToken,
  createAuthResponse,
  createErrorResponse
} from './api-auth';

// Structured Logging
export { default as logger, createRequestLogger, generateRequestId } from './logger';

// Environment Validation
export { validateEnv, requiredEnvVars } from './env-validation';

// Database Utilities
export {
  prisma,
  withRetry,
  withTimeout,
  optimizedQuery,
  disconnectFromDB,
  checkDbHealth
} from './db-utils';

// Performance Utilities
export { withCache, createLazyImport, performanceUtils } from './performance';

// Audit Logging
export { auditLog, AuditAction } from './audit-log';

// API Documentation
export { apiDocs, documentEndpoint } from './api-docs';
