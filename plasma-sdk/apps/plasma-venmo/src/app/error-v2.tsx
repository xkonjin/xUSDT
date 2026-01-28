

'use client';

import { useEffect, useState, FC } from 'react';
import { AlertCircle, Home, WifiOff, ShieldAlert, ServerCrash } from 'lucide-react';

// --- TYPE DEFINITIONS ---

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorCategories = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  UNKNOWN: 'unknown',
} as const;

type ErrorCategory = typeof ErrorCategories[keyof typeof ErrorCategories];

// --- HELPER FUNCTIONS ---

/**
 * Gets a structured error category from an error message.
 * This helps in displaying more specific and helpful error messages to the user.
 */
function getErrorCategory(error: Error): ErrorCategory {
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

const errorDetails: Record<ErrorCategory, { icon: FC<any>; title: string; message: string }> = {
  [ErrorCategories.NETWORK]: {
    icon: WifiOff,
    title: 'Network Error',
    message: 'Please check your internet connection and try again. It seems we are having trouble reaching our servers.',
  },
  [ErrorCategories.AUTHENTICATION]: {
    icon: ShieldAlert,
    title: 'Authentication Failed',
    message: 'Your session may have expired. Please try logging in again.',
  },
  [ErrorCategories.VALIDATION]: {
    icon: AlertCircle,
    title: 'Invalid Data',
    message: 'The data provided was incorrect. Please check your inputs and try again.',
  },
  [ErrorCategories.UNKNOWN]: {
    icon: ServerCrash,
    title: 'Oops! Something went wrong',
    message: 'An unexpected error occurred. Our team has been notified. Please try again in a few moments.',
  },
};

// --- MAIN COMPONENT ---

/**
 * Global Error Boundary for Client-Side Errors.
 * Catches and displays errors from React components, providing recovery options.
 * Improved with specific error messages, accessibility enhancements, and loading states.
 */
export default function ClientError({ error, reset }: ErrorProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Log error to an error reporting service (e.g., Sentry)
    console.error('Client-side error:', error);
  }, [error]);

  const category = getErrorCategory(error);
  const { icon: Icon, title, message } = errorDetails[category];

  const handleReset = () => {
    setIsLoading(true);
    try {
      reset();
    } catch (e) {
      console.error("Failed to reset error boundary:", e);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 bg-plasma-900"
      role="alert"
      aria-live="assertive"
    >
      <div className="clay-card max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
            <Icon className="w-10 h-10 text-red-500" aria-hidden="true" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4 font-heading">
          {title}
        </h1>

        <p className="text-plasma-300 mb-6 font-body">
          {message}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleReset}
            className="clay-button w-full"
            disabled={isLoading}
            aria-label={isLoading ? 'Attempting to recover' : 'Try Again'}
          >
            {isLoading ? 'Loading...' : 'Try Again'}
          </button>

          <button
            onClick={() => (window.location.href = '/')}
            className="clay-button w-full !bg-white/10 !text-white"
            aria-label="Go to Home Page"
          >
            <Home className="w-4 h-4 mr-2" aria-hidden="true" />
            Go Home
          </button>
        </div>

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

