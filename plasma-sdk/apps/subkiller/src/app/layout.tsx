/**
 * Root Layout for SubKiller App
 * 
 * Provides NextAuth session context for authentication.
 * Uses Space Grotesk for headings and Inter for body text.
 */

import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#EF4444',
};

export const metadata: Metadata = {
  title: 'SubKiller - Kill Your Subscriptions',
  description: 'Scan your email, find hidden subscriptions, and cancel them with one click. Pay just $0.99 with gasless USDT0.',
  keywords: ['subscription', 'cancel', 'email scanner', 'money saver', 'crypto', 'USDT'],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className={inter.className}>
        <Providers>
          <main className="min-h-dvh">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
