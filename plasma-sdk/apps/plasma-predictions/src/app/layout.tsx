import { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { Toaster } from "sonner";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Plasma Predictions - Bet on What Happens Next",
    template: "%s | Plasma Predictions",
  },
  description:
    "The fastest prediction market. Zero gas fees. Instant settlement. Bet on politics, crypto, sports and more.",
  keywords: ["prediction market", "crypto betting", "polymarket", "zero gas", "instant settlement"],
  authors: [{ name: "Plasma" }],
  creator: "Plasma",
  metadataBase: new URL("https://predictions.plasma.to"),
  openGraph: {
    title: "Plasma Predictions - Bet on What Happens Next",
    description: "Zero-gas prediction markets with instant settlement. Bet on politics, crypto, sports and more.",
    url: "https://predictions.plasma.to",
    siteName: "Plasma Predictions",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plasma Predictions - Bet on What Happens Next",
    description: "Zero-gas prediction markets with instant settlement. Bet on politics, crypto, sports and more.",
    creator: "@plasma",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen">
        <Providers>
          <DemoModeBanner />
          {children}
          <Toaster 
            theme="dark"
            position="bottom-center"
            toastOptions={{
              style: {
                background: 'rgba(0, 0, 0, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
