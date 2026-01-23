import { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { Toaster } from "sonner";

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    default: "Pledictions - Predict the Future",
    template: "%s | Pledictions",
  },
  description:
    "The fastest prediction market powered by Polymarket data. Zero gas fees. Instant settlement. Bet on politics, crypto, sports and more.",
  keywords: ["prediction market", "polymarket", "crypto betting", "zero gas", "instant settlement", "predictions"],
  authors: [{ name: "Pledictions" }],
  creator: "Pledictions",
  metadataBase: new URL("https://pledictions.app"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pledictions",
  },
  openGraph: {
    title: "Pledictions - Predict the Future",
    description: "Real prediction markets from Polymarket. Zero gas fees. Instant settlement.",
    url: "https://pledictions.app",
    siteName: "Pledictions",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pledictions - Predict the Future",
    description: "Real prediction markets from Polymarket. Zero gas fees. Instant settlement.",
    creator: "@pledictions",
  },
  robots: {
    index: true,
    follow: true,
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
  themeColor: "#8B5CF6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#8B5CF6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-dvh">
        <Providers>
          <DemoModeBanner />
          {children}
          <Toaster 
            theme="dark"
            position="bottom-center"
            toastOptions={{
              style: {
                background: 'rgba(26, 16, 48, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: 'white',
                borderRadius: '16px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
