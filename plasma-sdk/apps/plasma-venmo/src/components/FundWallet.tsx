"use client";

/**
 * FundWallet Component
 *
 * Allows users to fund their embedded wallet via:
 * 1. ZKP2P on-ramp (Venmo, Zelle, Revolut - trustless P2P)
 * 2. Bridge any token from other chains
 * 3. Transak on-ramp (fiat to crypto via card)
 * 4. External wallet transfer (MetaMask, etc.)
 * 5. Direct deposit address copy
 */

import { useState } from "react";
import dynamic from "next/dynamic";
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
  Sparkles,
  Zap,
} from "lucide-react";
import { ModalPortal } from "./ui/ModalPortal";

const BridgeDepositModal = dynamic(
  () =>
    import("./BridgeDeposit").then((mod) => ({
      default: mod.BridgeDepositModal,
    })),
  {
    loading: () => (
      <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded-lg w-1/2" />
          <div className="h-32 bg-white/10 rounded-lg" />
          <div className="h-12 bg-white/10 rounded-lg" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

const ZKP2POnrampV2 = dynamic(() => import("./onramp/ZKP2POnrampV2"), {
  loading: () => (
    <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/10 rounded-lg w-1/2" />
        <div className="h-32 bg-white/10 rounded-lg" />
        <div className="h-12 bg-white/10 rounded-lg" />
      </div>
    </div>
  ),
  ssr: false,
});

interface FundWalletProps {
  walletAddress: string | undefined;
  onClose?: () => void;
}

// Transak configuration
const TRANSAK_API_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;
const TRANSAK_ENV = process.env.NEXT_PUBLIC_TRANSAK_ENV || "STAGING"; // STAGING or PRODUCTION
const isTransakConfigured = Boolean(
  TRANSAK_API_KEY && TRANSAK_API_KEY !== "your-transak-api-key"
);

function getTransakUrl(walletAddress: string, amount?: number): string {
  if (!TRANSAK_API_KEY) {
    console.warn("Transak API key not configured");
    return "#";
  }

  const baseUrl =
    TRANSAK_ENV === "PRODUCTION"
      ? "https://global.transak.com"
      : "https://global-stg.transak.com";

  const params = new URLSearchParams({
    apiKey: TRANSAK_API_KEY,
    cryptoCurrencyCode: "USDT",
    network: "plasma",
    walletAddress: walletAddress,
    disableWalletAddressForm: "true",
    themeColor: "1DB954",
    hideMenu: "true",
    isFeeCalculationHidden: "true",
    exchangeScreenTitle: "Add Funds to Plenmo",
  });

  if (amount) {
    params.set("defaultFiatAmount", amount.toString());
    params.set("fiatCurrency", "USD");
  }

  return `${baseUrl}?${params.toString()}`;
}

export function FundWalletButton({
  walletAddress,
}: {
  walletAddress: string | undefined;
}) {
  const [showModal, setShowModal] = useState(false);

  if (!walletAddress) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-plenmo-500/20 to-plenmo-600/20 text-plenmo-500 hover:from-plenmo-500/30 hover:to-plenmo-600/30 transition-all duration-200 text-sm font-medium"
        data-avatar-tip="Add funds using Venmo, card, external wallet, or copy your address."
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
  const [selectedMethod, setSelectedMethod] = useState<
    "zkp2p" | "card" | "wallet" | "bridge" | null
  >(null);

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

  // ZKP2P On-ramp view
  if (selectedMethod === "zkp2p") {
    return (
      <ModalPortal
        isOpen={true}
        onClose={onClose || (() => undefined)}
        zIndex={120}
      >
        <ZKP2POnrampV2
          recipientAddress={walletAddress}
          onClose={() => setSelectedMethod(null)}
          onSuccess={() => {
            // Optionally close modal or show success
          }}
        />
      </ModalPortal>
    );
  }

  // Card payment view
  if (selectedMethod === "card") {
    return (
      <ModalPortal
        isOpen={true}
        onClose={onClose || (() => undefined)}
        zIndex={120}
      >
        <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-6">
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-600 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Buy with Card</h3>
            <p className="text-white/50 text-sm mb-6">
              Add funds using your debit card, credit card, Apple Pay, or Google
              Pay.
            </p>

            {isTransakConfigured ? (
              <>
                <button
                  onClick={openTransak}
                  className="w-full clay-button clay-button-primary mb-4"
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
                    Buy USDT with debit card, credit card, Apple Pay & Google
                    Pay.
                  </p>
                </div>

                {/* Alternative: Use ZKP2P */}
                <p className="text-white/50 text-xs text-center">
                  For now, use Venmo or Zelle:
                </p>

                <button
                  onClick={() => setSelectedMethod("zkp2p")}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-plenmo-500 to-plenmo-600 text-white font-semibold hover:opacity-90 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Pay with Venmo/Zelle
                </button>
              </div>
            )}
          </div>
        </div>
      </ModalPortal>
    );
  }

  // External wallet view
  if (selectedMethod === "wallet") {
    return (
      <ModalPortal
        isOpen={true}
        onClose={onClose || (() => undefined)}
        zIndex={120}
      >
        <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-6">
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-600 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Send from External Wallet
            </h3>
            <p className="text-white/50 text-sm mb-6">
              Send funds from MetaMask, Rabby, or any wallet to your Plenmo
              address:
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
              <strong>Important:</strong> Make sure to send on the correct
              network. Sending from the wrong network may result in lost funds.
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
    <ModalPortal
      isOpen={true}
      onClose={onClose || (() => undefined)}
      zIndex={120}
    >
      <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-6 max-w-md w-full">
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
          Choose how you&apos;d like to add funds:
        </p>

        {/* Option 1: ZKP2P On-ramp (Featured) */}
        <button
          onClick={() => setSelectedMethod("zkp2p")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-plenmo-500/10 to-plenmo-600/10 hover:from-plenmo-500/20 hover:to-plenmo-600/20 transition-all mb-3 text-left border border-plenmo-500/30 relative overflow-hidden group"
        >
          {/* Animated gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-plenmo-500/0 via-plenmo-500/10 to-plenmo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-600 flex items-center justify-center flex-shrink-0 relative">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 relative">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold">Pay with Venmo/Zelle</h4>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-plenmo-500/30 text-plenmo-400 rounded-full animate-pulse">
                INSTANT
              </span>
            </div>
            <p className="text-white/50 text-sm">60 second on-ramp via ZKP2P</p>
          </div>
          <div className="flex items-center gap-1 text-plenmo-500">
            <Zap className="w-4 h-4" />
            <span className="text-white/30">→</span>
          </div>
        </button>

        {/* Option 2: Bridge Any Token */}
        <button
          onClick={() => setSelectedMethod("bridge")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all mb-3 text-left border border-white/10 hover:border-white/20"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <ArrowRightLeft className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold">Bridge Any Token</h4>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-plenmo-500/20 text-plenmo-400 rounded-full">
                MULTI-CHAIN
              </span>
            </div>
            <p className="text-white/50 text-sm">
              Convert ETH, USDC from any chain
            </p>
          </div>
          <span className="text-white/30">→</span>
        </button>

        {/* Option 3: Buy with Card */}
        <button
          onClick={() => setSelectedMethod("card")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors mb-3 text-left border border-white/10 hover:border-white/20"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-600 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold">Buy with Card</h4>
            <p className="text-white/50 text-sm">
              Use debit card, credit card, Apple Pay
            </p>
          </div>
          <span className="text-white/30">→</span>
        </button>

        {/* Option 4: Transfer from Wallet */}
        <button
          onClick={() => setSelectedMethod("wallet")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors mb-3 text-left border border-white/10 hover:border-white/20"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold">From External Wallet</h4>
            <p className="text-white/50 text-sm">
              MetaMask, Rabby, Rainbow, etc.
            </p>
          </div>
          <span className="text-white/30">→</span>
        </button>

        {/* Option 5: Receive from Friend */}
        <button
          onClick={copyAddress}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-left border border-white/10 hover:border-white/20"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-600 flex items-center justify-center flex-shrink-0">
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
          Zero fees on all transactions
        </p>
      </div>
    </ModalPortal>
  );
}

export default FundWalletModal;
