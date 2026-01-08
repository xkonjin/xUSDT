'use client';

import { ReactNode } from 'react';
import { PlasmaPrivyProvider } from '@plasma-pay/privy-auth';
import './globals.css';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Splitzy - Split Bills with Crypto</title>
        <meta name="description" content="Split bills instantly with friends. Pay with any crypto - ETH, SOL, USDC. Zero gas fees on Plasma." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-black text-white antialiased">
        <PlasmaPrivyProvider
          config={{
            appId: PRIVY_APP_ID,
            loginMethods: ['email', 'sms', 'google', 'apple'],
            appearance: {
              theme: 'dark',
              accentColor: '#00d4ff',
            },
          }}
        >
          {children}
        </PlasmaPrivyProvider>
      </body>
    </html>
  );
}
