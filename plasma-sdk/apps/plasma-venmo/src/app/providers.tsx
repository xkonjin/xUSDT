/**
 * Client-side Providers for Plasma Venmo
 * 
 * Handles Privy initialization with graceful fallback when
 * NEXT_PUBLIC_PRIVY_APP_ID is not configured (e.g., during build).
 */

'use client';

import { ReactNode, useState, useEffect } from 'react';
import { PlasmaPrivyProvider } from '@plasma-pay/privy-auth';

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
  
  // State to handle client-side rendering
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Show loading state during hydration
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black">
        {children}
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
  return (
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
  );
}

