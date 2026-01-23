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
import { InstallPWABanner } from '@/components/InstallPWABanner';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import Script from 'next/script';

export const metadata = {
  title: 'Plenmo - Pay Anyone Instantly',
  description: 'Send and receive money instantly with zero fees. Simple, secure, and lightning fast payments powered by Plasma.',
  keywords: ['payments', 'money transfer', 'send money', 'instant payments', 'zero fees'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Plenmo',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: '#1DB954',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1DB954" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[rgb(10,10,15)] min-h-dvh font-body antialiased">
        <Providers>
          <ToastProvider>
            {children}
            <InstallPWABanner />
            <OfflineIndicator />
          </ToastProvider>
        </Providers>

        {/* PWA Install Prompt Handling */}
        <Script id="pwa-install-handler" strategy="afterInteractive">
          {`
            let deferredPrompt;

            // Capture beforeinstallprompt event
            window.addEventListener('beforeinstallprompt', (e) => {
              e.preventDefault();
              deferredPrompt = e;
              // Dispatch custom event for UI components
              window.dispatchEvent(new CustomEvent('pwa-installable', { detail: e }));
            });

            // Handle appinstalled event
            window.addEventListener('appinstalled', () => {
              deferredPrompt = null;
              console.log('PWA installed successfully');
              // Dispatch custom event for UI components
              window.dispatchEvent(new Event('pwa-installed'));
            });

            // Expose install function globally for UI components
            window.triggerPWAInstall = async () => {
              if (!deferredPrompt) {
                console.warn('PWA install prompt not available');
                return false;
              }
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;
              console.log('PWA install outcome:', outcome);
              deferredPrompt = null;
              return outcome === 'accepted';
            };
          `}
        </Script>
      </body>
    </html>
  );
}
