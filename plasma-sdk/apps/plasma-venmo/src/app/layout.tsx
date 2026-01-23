/**
 * Root Layout for Plenmo App
 * 
 * Plenmo - Pay anyone instantly with green claymorphism design
 * Brand: #1DB954 green with soft, puffy 3D aesthetics
 * Fonts: Space Grotesk (headings) + Inter (body)
 */

import { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata = {
  title: 'Plenmo - Pay Anyone Instantly',
  description: 'Send and receive money instantly with zero fees. Simple, secure, and lightning fast payments powered by Plasma.',
  keywords: ['payments', 'money transfer', 'send money', 'instant payments', 'zero fees'],
  manifest: '/manifest.json',
  openGraph: {
    title: 'Plenmo - Pay Anyone Instantly',
    description: 'Send and receive money instantly with zero fees.',
    siteName: 'Plenmo',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plenmo - Pay Anyone Instantly',
    description: 'Send and receive money instantly with zero fees.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1DB954',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-[rgb(10,10,15)] min-h-dvh font-body antialiased">
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
