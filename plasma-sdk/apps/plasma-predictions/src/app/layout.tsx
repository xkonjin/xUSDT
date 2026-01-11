import { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Plasma Predictions - Bet on What Happens Next",
  description:
    "The fastest prediction market. Zero gas fees. Instant settlement. Bet on politics, crypto, sports and more.",
  openGraph: {
    title: "Plasma Predictions",
    description: "Zero-gas prediction markets with instant settlement",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
