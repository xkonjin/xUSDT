/**
 * Sentry Error Tracking Configuration
 * 
 * Initialize Sentry for error tracking in both client and server environments.
 * Integrates with Vercel for source maps and release tracking.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const IS_PRODUCTION = ENVIRONMENT === 'production';

/**
 * Initialize Sentry with proper configuration
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session replay for debugging (optional)
    replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always capture replays on errors
    
    // Filter out noisy errors
    ignoreErrors: [
      // Browser extensions
      /^chrome-extension:/,
      /^moz-extension:/,
      // Common browser noise
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      // Network errors (handle separately)
      'Failed to fetch',
      'Load failed',
    ],
    
    // Only send errors in production unless explicitly enabled
    enabled: IS_PRODUCTION || process.env.SENTRY_DEBUG === 'true',
    
    // Add context to errors
    beforeSend(event, hint) {
      // Don't send errors in development unless debug mode
      if (!IS_PRODUCTION && process.env.SENTRY_DEBUG !== 'true') {
        return null;
      }
      
      // Add custom tags
      event.tags = {
        ...event.tags,
        app: 'plenmo',
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
      };
      
      return event;
    },
    
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id?: string; email?: string; wallet?: string };
    level?: Sentry.SeverityLevel;
  }
) {
  if (!SENTRY_DSN) {
    console.error('[Sentry disabled] Error:', error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    if (context?.level) {
      scope.setLevel(context.level);
    }
    
    Sentry.captureException(error);
  });
}

/**
 * Capture a message with additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) {
  if (!SENTRY_DSN) {
    console.log(`[Sentry disabled] ${level}:`, message, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id?: string; email?: string; wallet?: string } | null) {
  if (!SENTRY_DSN) return;
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (!SENTRY_DSN) return;
  Sentry.addBreadcrumb(breadcrumb);
}

export { Sentry };
