/**
 * Root Layout for Plasma Stream App
 * 
 * Server component that wraps the app with client-side providers.
 * Requires NEXT_PUBLIC_PRIVY_APP_ID environment variable for production.
 */

import { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Plasma Stream - Stream Payments',
  description: 'Stream payments in real-time using gasless USDT0 on Plasma.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
