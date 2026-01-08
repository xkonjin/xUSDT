/**
 * Root Layout for SubKiller App
 * 
 * Provides NextAuth session context for authentication.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SubKiller - Kill Your Subscriptions',
  description: 'Scan your email, find hidden subscriptions, and cancel them with one click. Pay just $0.99 with gasless USDT0.',
  keywords: ['subscription', 'cancel', 'email scanner', 'money saver', 'crypto', 'USDT'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
