/**
 * Payment Metrics Logger
 * 
 * Tracks key payment metrics for monitoring and analytics.
 * Logs to console in structured format and optionally to external services.
 */

import { captureMessage, addBreadcrumb } from './sentry';

export interface PaymentMetric {
  type: 'payment_initiated' | 'payment_success' | 'payment_failed' | 'payment_timeout';
  timestamp: string;
  correlationId: string;
  amount?: string;
  currency?: string;
  from?: string;
  to?: string;
  txHash?: string;
  blockNumber?: string;
  gasUsed?: string;
  duration?: number;
  error?: string;
  errorCode?: string;
  method?: 'transfer' | 'receive' | 'claim' | 'bridge';
  chain?: string;
}

export interface HealthMetric {
  type: 'health_check';
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latency?: number; error?: string }>;
}

type Metric = PaymentMetric | HealthMetric;

/**
 * Structured logger for metrics
 */
class MetricsLogger {
  private static instance: MetricsLogger;
  private metricsBuffer: Metric[] = [];
  private readonly flushInterval = 10000; // 10 seconds
  private readonly maxBufferSize = 100;
  
  private constructor() {
    // Flush metrics periodically (only in production)
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }
  
  static getInstance(): MetricsLogger {
    if (!MetricsLogger.instance) {
      MetricsLogger.instance = new MetricsLogger();
    }
    return MetricsLogger.instance;
  }
  
  /**
   * Log a metric
   */
  log(metric: Metric) {
    // Add to buffer
    this.metricsBuffer.push(metric);
    
    // Log to console in structured format
    const logPrefix = `[METRIC][${metric.type}]`;
    const logData = {
      ...metric,
      app: 'plenmo',
      env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    };
    
    if (metric.type === 'payment_failed') {
      console.error(logPrefix, JSON.stringify(logData));
    } else if (metric.type === 'payment_timeout') {
      console.warn(logPrefix, JSON.stringify(logData));
    } else {
      console.info(logPrefix, JSON.stringify(logData));
    }
    
    // Add Sentry breadcrumb
    addBreadcrumb({
      category: 'metric',
      message: metric.type,
      level: metric.type === 'payment_failed' ? 'error' : 'info',
      data: logData,
    });
    
    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }
  
  /**
   * Flush metrics buffer to external service (if configured)
   */
  async flush() {
    if (this.metricsBuffer.length === 0) return;
    
    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    // Log flush event
    console.info(`[METRICS] Flushing ${metrics.length} metrics`);
    
    // If analytics endpoint is configured, send metrics
    const analyticsEndpoint = process.env.METRICS_ENDPOINT;
    if (analyticsEndpoint) {
      try {
        await fetch(analyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics }),
        });
      } catch (error) {
        console.error('[METRICS] Failed to flush to endpoint:', error);
      }
    }
  }
}

export const metricsLogger = MetricsLogger.getInstance();

/**
 * Generate a correlation ID for tracking a payment through the system
 */
export function generateCorrelationId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Log payment initiated
 */
export function logPaymentInitiated(params: {
  correlationId: string;
  amount: string;
  currency?: string;
  from: string;
  to: string;
  method?: 'transfer' | 'receive' | 'claim' | 'bridge';
}) {
  metricsLogger.log({
    type: 'payment_initiated',
    timestamp: new Date().toISOString(),
    currency: 'USDT0',
    ...params,
  });
}

/**
 * Log payment success
 */
export function logPaymentSuccess(params: {
  correlationId: string;
  amount: string;
  currency?: string;
  from: string;
  to: string;
  txHash: string;
  blockNumber?: string;
  gasUsed?: string;
  duration: number;
  method?: 'transfer' | 'receive' | 'claim' | 'bridge';
  chain?: string;
}) {
  metricsLogger.log({
    type: 'payment_success',
    timestamp: new Date().toISOString(),
    currency: 'USDT0',
    chain: 'plasma',
    ...params,
  });
  
  // Also send to Sentry as info for tracking
  captureMessage(
    `Payment succeeded: ${params.amount} USDT0`,
    'info',
    {
      correlationId: params.correlationId,
      txHash: params.txHash,
      duration: params.duration,
    }
  );
}

/**
 * Log payment failure
 */
export function logPaymentFailed(params: {
  correlationId: string;
  amount?: string;
  currency?: string;
  from?: string;
  to?: string;
  error: string;
  errorCode?: string;
  duration?: number;
  method?: 'transfer' | 'receive' | 'claim' | 'bridge';
}) {
  metricsLogger.log({
    type: 'payment_failed',
    timestamp: new Date().toISOString(),
    currency: 'USDT0',
    ...params,
  });
}

/**
 * Log payment timeout
 */
export function logPaymentTimeout(params: {
  correlationId: string;
  amount?: string;
  from?: string;
  to?: string;
  duration: number;
}) {
  metricsLogger.log({
    type: 'payment_timeout',
    timestamp: new Date().toISOString(),
    currency: 'USDT0',
    ...params,
  });
}

/**
 * Log health check result
 */
export function logHealthCheck(params: {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latency?: number; error?: string }>;
}) {
  metricsLogger.log({
    type: 'health_check',
    timestamp: new Date().toISOString(),
    ...params,
  });
}
