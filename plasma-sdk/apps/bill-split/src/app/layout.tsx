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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Splitzy',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes',
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#F59E0B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-black text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
