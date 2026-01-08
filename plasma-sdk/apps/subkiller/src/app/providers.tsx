/**
 * Providers Component for SubKiller
 * 
 * Wraps the app with NextAuth SessionProvider for authentication context.
 * This is a client component that provides session state to the entire app.
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

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
 * - SessionProvider: Provides NextAuth session context for authentication
 * 
 * Being a client component allows it to properly handle session state
 * without issues during static page generation.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

