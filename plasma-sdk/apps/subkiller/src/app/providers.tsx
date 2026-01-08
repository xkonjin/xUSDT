/**
 * Providers Component for SubKiller
 * 
 * Wraps the app with:
 * - NextAuth SessionProvider: For Gmail OAuth authentication
 * - PlasmaPrivyProvider: For wallet connection and gasless payments
 * 
 * This dual-provider approach allows SubKiller to:
 * 1. Access Gmail for subscription scanning (NextAuth)
 * 2. Process USDT0 payments on Plasma chain (Privy wallet)
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { PlasmaPrivyProvider } from '@plasma-pay/privy-auth';
import { ReactNode, useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Props for the Providers component
 * @param children - React children to wrap with providers
 */
interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers Component
 * 
 * Wraps children with all necessary context providers:
 * - SessionProvider: Provides NextAuth session context for Gmail access
 * - PlasmaPrivyProvider: Provides wallet context for crypto payments
 * 
 * Note: Privy is optional - if NEXT_PUBLIC_PRIVY_APP_ID is not set,
 * the app will still work for scanning but payments will be disabled.
 */
export function Providers({ children }: ProvidersProps) {
  // Check if Privy is configured for wallet payments
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // State to handle client-side rendering
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Always wrap with SessionProvider for NextAuth (Gmail)
  // Optionally wrap with PlasmaPrivyProvider if configured
  if (!isMounted) {
    return (
      <SessionProvider>
        <div className="min-h-screen bg-black">
          {children}
        </div>
      </SessionProvider>
    );
  }
  
  // If Privy is not configured, just use SessionProvider
  // Payments will show a "wallet not configured" message
  if (!privyAppId) {
    return (
      <SessionProvider>
        {children}
      </SessionProvider>
    );
  }
  
  // Full setup with both Gmail access and wallet payments
  // Wrap with ErrorBoundary to catch any rendering errors
  return (
    <ErrorBoundary>
      <SessionProvider>
        <PlasmaPrivyProvider
          config={{
            appId: privyAppId,
            // Only wallet connection methods - we use NextAuth for email
            loginMethods: ['wallet', 'email'],
            appearance: {
              theme: 'dark',
              accentColor: '#00d4ff',
            },
          }}
        >
          {children}
        </PlasmaPrivyProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
