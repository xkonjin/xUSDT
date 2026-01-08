/**
 * Root Layout for Bill Split (Splitzy) App
 * 
 * Server component that wraps the app with client-side providers.
 * Requires NEXT_PUBLIC_PRIVY_APP_ID environment variable for production.
 * 
 * Note: This is a SERVER component (no 'use client' directive) to enable
 * proper Next.js metadata export for SEO and title rendering.
 */

import { ReactNode } from 'react';
import { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

/**
 * Metadata configuration for the Bill Split app
 * This only works in server components (without 'use client')
 */
export const metadata: Metadata = {
  title: 'Splitzy - Split Bills with Crypto',
  description: 'Split bills instantly with friends. Pay with any crypto - ETH, SOL, USDC. Zero gas fees on Plasma.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

/**
 * Root Layout Component
 * 
 * Wraps all pages with:
 * - HTML/body structure with dark theme styling
 * - Providers component for authentication context
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
