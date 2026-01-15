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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#1DB954" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
