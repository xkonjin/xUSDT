// This file configures the initialization of Sentry on the Edge runtime.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
});
