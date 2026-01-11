"use client";

/**
 * FundWallet Component
 * 
 * Allows users to fund their embedded wallet via:
 * 1. Transak on-ramp (fiat to crypto)
 * 2. External wallet transfer (MetaMask, etc.)
 * 3. Direct deposit address copy
 */

import { useState } from "react";
import { 
  Plus, 
  CreditCard, 
  Wallet, 
  Copy, 
  Check, 
  ExternalLink,
  X,
  ArrowDownLeft
} from "lucide-react";

interface FundWalletProps {
  walletAddress: string | undefined;
  onClose?: () => void;
}

// Transak configuration
const TRANSAK_API_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;
const TRANSAK_ENV = process.env.NEXT_PUBLIC_TRANSAK_ENV || "STAGING"; // STAGING or PRODUCTION
const isTransakConfigured = Boolean(TRANSAK_API_KEY && TRANSAK_API_KEY !== "your-transak-api-key");

function getTransakUrl(walletAddress: string, amount?: number): string {
  if (!TRANSAK_API_KEY) {
    console.warn("Transak API key not configured");
    return "#";
  }
  
  const baseUrl = TRANSAK_ENV === "PRODUCTION" 
    ? "https://global.transak.com" 
    : "https://global-stg.transak.com";
  
  const params = new URLSearchParams({
    apiKey: TRANSAK_API_KEY,
    cryptoCurrencyCode: "USDT",
    network: "plasma",
    walletAddress: walletAddress,
    disableWalletAddressForm: "true",
    themeColor: "00d4ff",
    hideMenu: "true",
    isFeeCalculationHidden: "true",
    exchangeScreenTitle: "Buy USDT0 for Plasma Venmo",
  });
  
  if (amount) {
    params.set("defaultFiatAmount", amount.toString());
    params.set("fiatCurrency", "USD");
  }
  
  return `${baseUrl}?${params.toString()}`;
}

// Modal backdrop component
function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-fade-in-scale">
        {children}
      </div>
    </div>
  );
}

export function FundWalletButton({ walletAddress }: { walletAddress: string | undefined }) {
  const [showModal, setShowModal] = useState(false);

  if (!walletAddress) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[rgb(0,212,255)]/20 to-purple-500/20 text-[rgb(0,212,255)] hover:from-[rgb(0,212,255)]/30 hover:to-purple-500/30 transition-all duration-200 text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Funds
      </button>

      {showModal && (
        <FundWalletModal 
          walletAddress={walletAddress} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
}

export function FundWalletModal({ walletAddress, onClose }: FundWalletProps) {
  const [copied, setCopied] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "wallet" | null>(null);

  if (!walletAddress) return null;

  const copyAddress = async () => {
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openTransak = () => {
    const url = getTransakUrl(walletAddress);
    window.open(url, "_blank", "width=450,height=700");
  };

  // If method selected, show that view
  if (selectedMethod === "card") {
    return (
      <ModalBackdrop onClose={onClose}>
        <div className="bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setSelectedMethod(null)}
              className="text-white/50 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button 
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Buy with Card</h3>
            <p className="text-white/50 text-sm mb-6">
              Purchase USDT using your debit card, credit card, Apple Pay, or Google Pay.
            </p>

            {isTransakConfigured ? (
              <>
                <button
                  onClick={openTransak}
                  className="w-full btn-primary mb-4"
                >
                  Open Transak
                  <ExternalLink className="w-4 h-4 ml-2" />
                </button>
                <p className="text-white/30 text-xs">
                  Powered by Transak. Processing may take a few minutes.
                </p>
              </>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                <p className="text-amber-400 text-sm mb-2">
                  Transak is not configured yet
                </p>
                <p className="text-white/40 text-xs">
                  Set NEXT_PUBLIC_TRANSAK_API_KEY in your environment variables.
                  <br />
                  Get an API key at{" "}
                  <a 
                    href="https://transak.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[rgb(0,212,255)] hover:underline"
                  >
                    transak.com
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </ModalBackdrop>
    );
  }

  if (selectedMethod === "wallet") {
    return (
      <ModalBackdrop onClose={onClose}>
        <div className="bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setSelectedMethod(null)}
              className="text-white/50 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button 
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Send from External Wallet</h3>
            <p className="text-white/50 text-sm mb-6">
              Send USDT0 from MetaMask, Rabby, or any wallet to your Plasma Venmo address:
            </p>

            {/* Address display */}
            <div className="bg-white/5 rounded-2xl p-4 mb-4">
              <p className="text-white/40 text-xs mb-2">Your Plasma Venmo Address</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-white text-sm font-mono break-all">
                  {walletAddress}
                </code>
                <button
                  onClick={copyAddress}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/50" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-400 text-xs text-left">
              <strong>Important:</strong> Only send USDT0 on Plasma Chain (Chain ID: 9745). 
              Sending other tokens or on wrong networks will result in lost funds.
            </div>
          </div>
        </div>
      </ModalBackdrop>
    );
  }

  // Main selection view
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Add Funds</h3>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-white/50 text-sm mb-6">
          Choose how you&apos;d like to add USDT0 to your wallet:
        </p>

        {/* Option 1: Buy with Card */}
        <button
          onClick={() => setSelectedMethod("card")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors mb-3 text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-blue-500 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold">Buy with Card</h4>
            <p className="text-white/50 text-sm">Use debit card, credit card, Apple Pay</p>
          </div>
          <span className="text-white/30">→</span>
        </button>

        {/* Option 2: Transfer from Wallet */}
        <button
          onClick={() => setSelectedMethod("wallet")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors mb-3 text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold">From External Wallet</h4>
            <p className="text-white/50 text-sm">MetaMask, Rabby, Rainbow, etc.</p>
          </div>
          <span className="text-white/30">→</span>
        </button>

        {/* Option 3: Receive from Friend */}
        <button
          onClick={copyAddress}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold">Receive from Friend</h4>
            <p className="text-white/50 text-sm">
              {copied ? "Address copied!" : "Copy your wallet address"}
            </p>
          </div>
          {copied ? (
            <Check className="w-5 h-5 text-green-400" />
          ) : (
            <Copy className="w-5 h-5 text-white/30" />
          )}
        </button>

        {/* Footer */}
        <p className="text-white/30 text-xs text-center mt-6">
          Zero gas fees on all Plasma transactions
        </p>
      </div>
    </ModalBackdrop>
  );
}

export default FundWalletModal;
