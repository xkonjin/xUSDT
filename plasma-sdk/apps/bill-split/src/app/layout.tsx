/**
 * Root Layout for Bill Split (Splitzy) App
 *
 * Server component that wraps the app with client-side providers.
 * Requires NEXT_PUBLIC_PRIVY_APP_ID environment variable for production.
 *
 * Note: This is a SERVER component (no 'use client' directive) to enable
 * proper Next.js metadata export for SEO and title rendering.
 */

import { ReactNode } from "react";
import { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { OfflineIndicator } from "@/components/OfflineIndicator";

/**
 * Metadata configuration for the Bill Split app
 * This only works in server components (without 'use client')
 */
export const metadata: Metadata = {
  title: "Splitzy - Split Bills with Crypto",
  description:
    "Split bills instantly with friends. Pay with any crypto - ETH, SOL, USDC. Zero gas fees on Plasma.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Splitzy",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
        <meta name="theme-color" content="#0A0A0F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-black text-white antialiased">
        <Providers>
          <OfflineIndicator />
          {children}
        </Providers>
      </body>
    </html>
  );
}
