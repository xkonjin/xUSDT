'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Home } from 'lucide-react';

/**
 * Global Error Boundary for Client-Side Errors
 *
 * Catches and displays errors from React components
 * Provides recovery options for users
 *
 * See: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global error:', error);

    // TODO: Send to Sentry
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-plasma-900">
      <div className="clay-card max-w-md w-full p-8 text-center">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-3xl font-bold text-white mb-4 font-heading">
          Oops! Something went wrong
        </h1>

        <p className="text-plasma-300 mb-6 font-body">
          {error.message || 'An unexpected error occurred'}
        </p>

        {/* Recovery Options */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            variant="primary"
            className="w-full"
          >
            Try Again
          </Button>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="secondary"
            className="w-full"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        {/* Help Link */}
        <p className="text-plasma-400 text-sm mt-6 font-body">
          Need help?{' '}
          <a
            href="mailto:support@plenmo.com"
            className="text-plenmo-500 hover:text-plenmo-400 underline"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * Error metadata for logging
 * Can be used to categorize and track errors
 */
export const ErrorCategories = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  UNKNOWN: 'unknown',
} as const;

/**
 * Get error category from error message
 */
export function getErrorCategory(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return ErrorCategories.NETWORK;
  }

  if (message.includes('invalid') || message.includes('validation')) {
    return ErrorCategories.VALIDATION;
  }

  if (message.includes('unauthorized') || message.includes('auth')) {
    return ErrorCategories.AUTHENTICATION;
  }

  return ErrorCategories.UNKNOWN;
}
