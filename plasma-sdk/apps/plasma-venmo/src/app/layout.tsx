'use client';

import { ReactNode } from 'react';
import { PlasmaPrivyProvider } from '@plasma-pay/privy-auth';
import './globals.css';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
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
