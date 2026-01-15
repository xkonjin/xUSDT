/**
 * Root Layout for StreamPay
 * 
 * Server component that wraps the app with client-side providers.
 * Features Liquid Glass design with Space Grotesk + Inter fonts.
 * Requires NEXT_PUBLIC_PRIVY_APP_ID environment variable for production.
 */

import { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'StreamPay - Real-time Salary Streaming',
  description: 'Stream salary payments in real-time. Pay your team by the second with zero gas fees.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
