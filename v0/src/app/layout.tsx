import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "../components/Nav";
import { CartProvider } from "./lib/cart";
import { WalletProvider } from "./lib/wallet";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "xUSDT Demo",
  description: "USD₮ EIP-3009 payments demo on Plasma & Ethereum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <WalletProvider>
          <CartProvider>
            <Nav />
            <div className="xui-container">
              {children}
            </div>
          </CartProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
