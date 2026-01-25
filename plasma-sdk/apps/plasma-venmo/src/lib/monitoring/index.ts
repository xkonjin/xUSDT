/**
 * Monitoring & Alerting Module
 * 
 * Central export for all monitoring utilities.
 * 
 * Usage:
 *   import { captureException, logPaymentSuccess, alertTransactionFailed } from '@/lib/monitoring';
 */

// Sentry error tracking
export {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  Sentry,
} from './sentry';

// Metrics logging
export {
  metricsLogger,
  generateCorrelationId,
  logPaymentInitiated,
  logPaymentSuccess,
  logPaymentFailed,
  logPaymentTimeout,
  logHealthCheck,
  type PaymentMetric,
  type HealthMetric,
} from './metrics';

// Alerting
export {
  alertTransactionFailed,
  determineSeverity,
  getAlertConfig,
  type AlertContext,
} from './alerts';
