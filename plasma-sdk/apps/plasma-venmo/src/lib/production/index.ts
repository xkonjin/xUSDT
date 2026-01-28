/**
 * Production Utilities Index
 * 
 * This module exports all production-grade utilities for the xUSDT/Plenmo app.
 * These utilities provide security, monitoring, and performance enhancements.
 */

// API Authentication and Security
export { withApiAuth } from './api-auth';

// Structured Logging
export { default as logger } from './logger';

// Environment Validation
export { validateEnv, requiredEnvVars } from './env-validation';

// Database Utilities
export { withDbConnection, optimizedQuery } from './db-utils';

// Performance Utilities
export { withCache, lazyLoad } from './performance';

// Audit Logging
export { auditLog, AuditAction } from './audit-log';
