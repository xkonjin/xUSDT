/**
 * Client-side Providers for Bill Split (Splitzy)
 * 
 * Handles Privy initialization with graceful fallback when
 * NEXT_PUBLIC_PRIVY_APP_ID is not configured (e.g., during build).
 * 
 * This is a client component that provides authentication context
 * to the entire app via PlasmaPrivyProvider.
 */

'use client';

import { ReactNode, useState, useEffect } from 'react';
import { PlasmaPrivyProvider } from '@plasma-pay/privy-auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers Component
 * 
 * Conditionally initializes PlasmaPrivyProvider only when a valid
 * Privy app ID is available. This prevents build failures when
 * environment variables are not set during static generation.
 */
export function Providers({ children }: ProvidersProps) {
  // Check if Privy app ID is configured
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // State to handle client-side rendering (prevents hydration mismatch)
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Show loading spinner during hydration - DO NOT render children here
  // as they may call Privy hooks before the provider is ready
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[rgb(0,212,255)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  // If no Privy app ID, show configuration message
  if (!privyAppId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
          <p className="text-gray-400">
            Please set NEXT_PUBLIC_PRIVY_APP_ID environment variable
          </p>
        </div>
      </div>
    );
  }
  
  // Render with Privy provider when app ID is available
  // Wrap with ErrorBoundary to catch any rendering errors
  return (
    <ErrorBoundary>
      <PlasmaPrivyProvider
        config={{
          appId: privyAppId,
          loginMethods: ['email', 'sms', 'google', 'apple'],
          appearance: {
            theme: 'dark',
            accentColor: '#00d4ff',
          },
        }}
      >
        {children}
      </PlasmaPrivyProvider>
    </ErrorBoundary>
  );
}

