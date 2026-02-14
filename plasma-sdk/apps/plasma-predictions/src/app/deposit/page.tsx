"use client";

import { useState } from "react";
import { 
  QrCode, Copy, Check, Wallet, 
  CreditCard, AlertCircle, ExternalLink, RefreshCw
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useDemoStore } from "@/lib/demo-store";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@/lib/constants";
import { toast } from "sonner";

export default function DepositPage() {
  const { isDemoMode } = useDemoStore();
  const [copied, setCopied] = useState(false);
  const [balance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Demo wallet address
  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f8bD2E";
  const shortenedAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const refreshBalance = async () => {
    setIsRefreshing(true);
    // Simulate balance check
    await new Promise(r => setTimeout(r, 1500));
    setIsRefreshing(false);
    toast.info("Balance updated");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20 md:pb-8">
      <Header />
      
      <main className="max-w-lg mx-auto px-4 pt-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Deposit USDT₀</h1>
          <p className="text-white/60">
            Fund your account to start making predictions
          </p>
        </div>

        {/* Demo Mode Notice */}
        {isDemoMode && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium">Demo Mode Active</p>
                <p className="text-yellow-400/70 text-sm">
                  You have $10,000 paper balance. No real deposits needed!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Balance */}
        <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-white">
                ${isDemoMode ? "10,000.00" : balance.toFixed(2)}
              </p>
            </div>
            <button
              onClick={refreshBalance}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <RefreshCw className={`w-5 h-5 text-white/60 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Deposit Methods */}
        <div className="space-y-4">
          {/* Crypto Deposit */}
          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <QrCode className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Deposit Crypto</h3>
                <p className="text-xs text-white/40">Send USDT₀ on Plasma Network</p>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="w-48 h-48 mx-auto mb-4 bg-white rounded-xl p-3 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl">
              <Wallet className="w-4 h-4 text-white/40" />
              <code className="flex-1 text-sm text-white/80 font-mono truncate">
                {shortenedAddress}
              </code>
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
              </button>
            </div>

            {/* Network Info */}
            <div className="mt-4 p-3 bg-cyan-500/10 rounded-xl">
              <p className="text-xs text-cyan-400">
                <strong>Network:</strong> Plasma ({PLASMA_MAINNET_CHAIN_ID})
                <br />
                <strong>Token:</strong> USDT₀ ({USDT0_ADDRESS.slice(0, 10)}...)
                <br />
                <strong>Minimum:</strong> $1.00
              </p>
            </div>
          </div>

          {/* Fiat On-Ramp */}
          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CreditCard className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Buy with Card</h3>
                <p className="text-xs text-white/40">Purchase USDT₀ via partner</p>
              </div>
            </div>

            <div className="space-y-2">
              <OnRampButton
                name="Transak"
                description="Card, Bank Transfer"
                href="https://global.transak.com/"
              />
              <OnRampButton
                name="MoonPay"
                description="Card, Apple Pay"
                href="https://www.moonpay.com/"
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <h4 className="font-medium text-white mb-3">How to Deposit</h4>
          <ol className="space-y-2 text-sm text-white/60">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">1</span>
              <span>Copy your deposit address above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">2</span>
              <span>Send USDT₀ on the Plasma network</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">3</span>
              <span>Balance updates within 30 seconds</span>
            </li>
          </ol>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function OnRampButton({ name, description, href }: { name: string; description: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition"
    >
      <div>
        <p className="text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-white/40" />
    </a>
  );
}
