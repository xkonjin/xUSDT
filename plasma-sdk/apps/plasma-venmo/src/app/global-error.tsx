'use client';

/**
 * Global Error Boundary for Root-Level Errors
 *
 * Catches errors that occur during rendering
 * Provides a fallback UI when the entire app fails
 *
 * This is the most general error boundary in the app
 * See: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html>
      <body>
        <div className="min-h-dvh flex items-center justify-center bg-plasma-900 p-4">
          <div className="clay-card max-w-md w-full p-8 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.932-3L13.932 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.932 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-3xl font-bold text-white mb-4 font-heading">
              Application Error
            </h1>

            <p className="text-plasma-300 mb-6 font-body">
              Something went wrong and the application could not recover.
              Please refresh the page or try again later.
            </p>

            {/* Recovery Options */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="clay-button w-full"
              >
                Refresh Page
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="clay-button w-full !bg-white/10 !text-white"
              >
                Go Home
              </button>
            </div>

            {/* Error ID for Support */}
            {error.digest && (
              <p className="text-plasma-400 text-sm mt-6 font-body">
                Error ID: <code className="bg-white/10 px-2 py-1 rounded">{error.digest}</code>
              </p>
            )}

            {/* Help Link */}
            <p className="text-plasma-400 text-sm mt-4 font-body">
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
      </body>
    </html>
  );
}
