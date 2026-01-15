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
  ArrowDownLeft,
  ArrowRightLeft,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ModalPortal } from "./ui/ModalPortal";
import { BridgeDepositModal } from "./BridgeDeposit";

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
    exchangeScreenTitle: "Buy USDT0 for Plenmo",
  });
  
  if (amount) {
    params.set("defaultFiatAmount", amount.toString());
    params.set("fiatCurrency", "USD");
  }
  
  return `${baseUrl}?${params.toString()}`;
}

export function FundWalletButton({ walletAddress }: { walletAddress: string | undefined }) {
  const [showModal, setShowModal] = useState(false);

  if (!walletAddress) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[rgb(0,212,255)]/20 to-purple-500/20 text-[rgb(0,212,255)] hover:from-[rgb(0,212,255)]/30 hover:to-purple-500/30 transition-all duration-200 text-sm font-medium"
        data-avatar-tip="Add funds using card, external wallet, or copy your address."
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
  const [selectedMethod, setSelectedMethod] = useState<"card" | "wallet" | "bridge" | null>(null);

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
      <ModalPortal isOpen={true} onClose={onClose || (() => undefined)} zIndex={120}>
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
              <div className="space-y-4">
                {/* Coming Soon Badge */}
                <div className="bg-plenmo-500/10 border border-plenmo-500/30 rounded-2xl p-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-plenmo-500/20 text-plenmo-400 text-xs font-semibold mb-2">
                    <span className="w-2 h-2 rounded-full bg-plenmo-500 animate-pulse" />
                    Coming Soon
                  </div>
                  <p className="text-white/70 text-sm font-medium mb-1">
                    Card payments launching soon!
                  </p>
                  <p className="text-white/40 text-xs">
                    Buy USDT with debit card, credit card, Apple Pay & Google Pay.
                  </p>
                </div>
                
                {/* Alternative: Copy Address */}
                <p className="text-white/50 text-xs text-center">
                  For now, fund your wallet by transferring USDT0:
                </p>
                
                <div className="bg-white/5 rounded-2xl p-4">
                  <p className="text-white/40 text-xs mb-2">Your Plenmo Address</p>
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
                
                {/* QR Code */}
                <div className="bg-white rounded-2xl p-4 flex flex-col items-center">
                  <QRCodeSVG 
                    value={walletAddress} 
                    size={160} 
                    level="M"
                    includeMargin={false}
                  />
                  <p className="text-gray-600 text-xs mt-2">
                    Scan to get address
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ModalPortal>
    );
  }

  if (selectedMethod === "wallet") {
    return (
      <ModalPortal isOpen={true} onClose={onClose || (() => undefined)} zIndex={120}>
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
              Send USDT0 from MetaMask, Rabby, or any wallet to your Plenmo address:
            </p>

            {/* Address display */}
            <div className="bg-white/5 rounded-2xl p-4 mb-4">
              <p className="text-white/40 text-xs mb-2">Your Plenmo Address</p>
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
      </ModalPortal>
    );
  }

  // Bridge method - shows BridgeDepositModal
  if (selectedMethod === "bridge") {
    return (
      <BridgeDepositModal
        recipientAddress={walletAddress}
        onClose={() => setSelectedMethod(null)}
      />
    );
  }

  // Main selection view
  return (
    <ModalPortal isOpen={true} onClose={onClose || (() => undefined)} zIndex={120}>
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

        {/* Option 1: Bridge Any Token (Featured) */}
        <button
          onClick={() => setSelectedMethod("bridge")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[rgb(0,212,255)]/10 to-purple-500/10 hover:from-[rgb(0,212,255)]/20 hover:to-purple-500/20 transition-all mb-3 text-left border border-[rgb(0,212,255)]/20"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center flex-shrink-0">
            <ArrowRightLeft className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold">Bridge Any Token</h4>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] rounded-full">
                NEW
              </span>
            </div>
            <p className="text-white/50 text-sm">Convert ETH, USDC from any chain</p>
          </div>
          <span className="text-white/30">→</span>
        </button>

        {/* Option 2: Buy with Card */}
        <button
          onClick={() => setSelectedMethod("card")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors mb-3 text-left"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold">Buy with Card</h4>
            <p className="text-white/50 text-sm">Use debit card, credit card, Apple Pay</p>
          </div>
          <span className="text-white/30">→</span>
        </button>

        {/* Option 3: Transfer from Wallet */}
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

        {/* Option 4: Receive from Friend */}
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
    </ModalPortal>
  );
}

export default FundWalletModal;
