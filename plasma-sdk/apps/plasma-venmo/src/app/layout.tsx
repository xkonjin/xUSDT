/**
 * Root Layout for Plasma Venmo App
 * 
 * Server component that wraps the app with client-side providers.
 * Requires NEXT_PUBLIC_PRIVY_APP_ID environment variable for production.
 */

import { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata = {
  title: 'Plasma Venmo - Send Money Instantly',
  description: 'Send money to anyone instantly using gasless USDT0 on Plasma.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
