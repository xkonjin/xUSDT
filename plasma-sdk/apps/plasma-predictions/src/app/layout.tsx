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
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8B5CF6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
