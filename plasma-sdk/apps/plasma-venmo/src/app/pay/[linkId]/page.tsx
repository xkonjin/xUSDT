"use client";

/**
 * Pay Page - /pay/[linkId]
 *
 * Unified payment link page — anyone can pay, no login required.
 * Fiat-first payment method picker: Venmo, Zelle, Cash App, Card, Crypto.
 */

import { useState, useEffect, useCallback } from "react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { parseUnits } from "viem";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Wallet,
  CreditCard,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import {
  createTransferParams,
  buildTransferAuthorizationTypedData,
} from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";
import { parseUserFriendlyError } from "@/lib/validation";

// Type for payment link data
interface PaymentLinkData {
  id: string;
  creatorAddress: string;
  creatorEmail?: string;
  amount: number | null;
  currency: string;
  memo?: string;
  status: string;
  paidBy?: string;
  paidAt?: string;
  txHash?: string;
  expiresAt?: string;
  createdAt: string;
  url: string;
}

// Payment method definitions
const FIAT_METHODS = [
  {
    id: "venmo",
    name: "Venmo",
    icon: "💜",
    description: "Pay with your Venmo account",
    available: true,
  },
  {
    id: "zelle",
    name: "Zelle",
    icon: "🟣",
    description: "Pay with Zelle",
    available: true,
  },
  {
    id: "cashapp",
    name: "Cash App",
    icon: "💚",
    description: "Pay with Cash App",
    available: true,
  },
  {
    id: "card",
    name: "Card",
    icon: "💳",
    description: "Credit or debit card",
    available: false, // Coming soon — Stripe integration
  },
] as const;

// Helper to split signature into v, r, s components
function splitSignature(signature: `0x${string}`): {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
} {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

// ZKP2P URL builder
function buildZKP2PUrl(
  amount: string,
  recipientAddress: string,
  method: string
): string {
  const params = new URLSearchParams({
    amount,
    recipient: recipientAddress,
    platform: method,
    chainId: "98866",
    token: USDT0_ADDRESS,
  });
  return `https://www.zkp2p.xyz/swap?${params.toString()}`;
}

export default function PayPage({ params }: { params: { linkId: string } }) {
  const linkId = params.linkId;

  // Wallet and auth state
  const { authenticated, ready, wallet, login } = usePlasmaWallet();
  const { formatted: balance } = useUSDT0Balance();

  // Page state
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Fetch payment link details
  useEffect(() => {
    if (!linkId) return;

    async function fetchLink() {
      try {
        const response = await fetch(`/api/payment-links/${linkId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Payment link not found");
          setLoading(false);
          return;
        }

        setPaymentLink(data.paymentLink);

        // Pre-fill amount if fixed
        if (data.paymentLink.amount !== null) {
          setAmount(data.paymentLink.amount.toString());
        }
      } catch (err) {
        console.error("Failed to load payment link:", err);
        setError("Failed to load payment link");
      } finally {
        setLoading(false);
      }
    }

    fetchLink();
  }, [linkId]);

  // Handle Plenmo balance payment
  const handlePlenmoPayment = useCallback(async () => {
    if (!wallet || !paymentLink || !amount) return;

    setPaying(true);
    setError(null);

    try {
      const amountInUnits = parseUnits(amount, 6);
      const transferParams = createTransferParams(
        wallet.address,
        paymentLink.creatorAddress as `0x${string}`,
        amountInUnits
      );

      const typedData = buildTransferAuthorizationTypedData(transferParams, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      const signature = await wallet.signTypedData(typedData);
      const { v, r, s } = splitSignature(signature);

      const response = await fetch(`/api/payment-links/${linkId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: transferParams.from,
          to: transferParams.to,
          value: transferParams.value.toString(),
          validAfter: transferParams.validAfter,
          validBefore: transferParams.validBefore,
          nonce: transferParams.nonce,
          v,
          r,
          s,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment failed");
      }

      setSuccess(result.txHash);
      setPaymentLink((prev) =>
        prev
          ? {
              ...prev,
              status: "paid",
              paidBy: wallet.address,
              txHash: result.txHash,
            }
          : null
      );
    } catch (err) {
      const rawError = err instanceof Error ? err.message : "Payment failed";
      setError(
        parseUserFriendlyError(rawError, {
          amount,
          balance: balance || "0",
        })
      );
    } finally {
      setPaying(false);
    }
  }, [wallet, paymentLink, amount, linkId, balance]);

  // Handle fiat payment via ZKP2P
  const handleFiatPayment = useCallback(
    (methodId: string) => {
      if (!paymentLink || !amount) return;
      const url = buildZKP2PUrl(amount, paymentLink.creatorAddress, methodId);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [paymentLink, amount]
  );

  // Derive display name from creator info
  const recipientName =
    paymentLink?.creatorEmail?.split("@")[0] ||
    (paymentLink?.creatorAddress
      ? `${paymentLink.creatorAddress.slice(
          0,
          6
        )}...${paymentLink.creatorAddress.slice(-4)}`
      : "");

  // Loading state
  if (loading || !ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-plenmo-500/20 border-t-plenmo-500 animate-spin" />
          <span className="text-white/40 text-sm font-body">Loading...</span>
        </div>
      </main>
    );
  }

  // Error state (no link data)
  if (error && !paymentLink) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))] p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400/60 mx-auto mb-4" />
          <h1 className="text-lg font-heading font-semibold text-white mb-2">
            Link Error
          </h1>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <Link
            href="/"
            className="text-white/50 text-sm hover:text-white/70 transition-colors"
          >
            Go to Plenmo
          </Link>
        </div>
      </main>
    );
  }

  // Not found
  if (!paymentLink) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))] p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h1 className="text-lg font-heading font-semibold text-white mb-2">
            Not Found
          </h1>
          <p className="text-white/40 text-sm mb-6">
            This payment link doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="text-white/50 text-sm hover:text-white/70 transition-colors"
          >
            Go to Plenmo
          </Link>
        </div>
      </main>
    );
  }

  // Success state
  if (paymentLink.status === "paid" || success) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))] p-4">
        <div className="max-w-sm w-full">
          <div className="clay-card p-8 text-center">
            <CheckCircle className="w-16 h-16 text-plenmo-500 mx-auto mb-4" />
            <h1 className="text-2xl font-heading font-bold text-white mb-2">
              Payment Complete
            </h1>
            <p className="text-white/40 text-sm mb-6">
              {paymentLink.amount !== null
                ? `$${paymentLink.amount} sent successfully`
                : "Payment sent successfully"}
            </p>

            {(success || paymentLink.txHash) && (
              <a
                href={`https://scan.plasma.to/tx/${
                  success || paymentLink.txHash
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white/50 text-sm hover:text-white/70 transition-colors mb-6"
              >
                View transaction
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="mt-4">
              <Link
                href="/"
                className="inline-block w-full py-3.5 rounded-xl bg-plenmo-500 text-black text-sm font-semibold text-center"
              >
                Open Plenmo
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Expired state
  if (paymentLink.status === "expired") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))] p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h1 className="text-lg font-heading font-semibold text-white mb-2">
            Link Expired
          </h1>
          <p className="text-white/40 text-sm mb-6">
            This payment link has expired.
          </p>
          <Link
            href="/"
            className="text-white/50 text-sm hover:text-white/70 transition-colors"
          >
            Go to Plenmo
          </Link>
        </div>
      </main>
    );
  }

  // Main payment UI — no login required to view
  const displayAmount = paymentLink.amount ?? parseFloat(amount);
  const hasValidAmount = displayAmount > 0;
  const hasSufficientBalance =
    authenticated && balance
      ? parseFloat(balance) >= (displayAmount || 0)
      : false;

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg-primary))] p-4">
      <div className="max-w-sm mx-auto pt-6 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-white/30 text-xs font-body uppercase tracking-widest mb-6">
            Plenmo
          </p>

          {/* Recipient */}
          <p className="text-white/50 text-sm font-body mb-1">
            Pay {recipientName}
          </p>

          {/* Amount */}
          {paymentLink.amount !== null ? (
            <div className="text-4xl md:text-5xl font-heading font-bold text-white tabular-nums mt-2">
              ${paymentLink.amount}
            </div>
          ) : (
            <div className="relative max-w-[200px] mx-auto mt-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-2xl font-heading">
                $
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-transparent text-center text-3xl font-heading font-bold text-white pl-8 pr-3 py-2 border-b border-white/10 focus:border-plenmo-500/50 focus:outline-none transition-colors tabular-nums"
                disabled={paying}
              />
            </div>
          )}

          {/* Memo */}
          {paymentLink.memo && (
            <p className="text-white/35 text-sm font-body mt-3 italic">
              &ldquo;{paymentLink.memo}&rdquo;
            </p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="space-y-2">
          <p className="text-white/30 text-xs font-body uppercase tracking-widest px-1 mb-3">
            Choose how to pay
          </p>

          {/* Plenmo Balance — only if logged in with sufficient balance */}
          {authenticated && wallet && hasSufficientBalance && (
            <button
              onClick={handlePlenmoPayment}
              disabled={!hasValidAmount || paying}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-plenmo-500/8 border border-plenmo-500/15 hover:bg-plenmo-500/12 transition-colors disabled:opacity-50 group"
            >
              <div className="w-10 h-10 rounded-full bg-plenmo-500 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-white text-sm font-medium block">
                  Plenmo Balance
                </span>
                <span className="text-white/35 text-xs">
                  ${balance} available
                </span>
              </div>
              {paying ? (
                <Loader2 className="w-4 h-4 text-plenmo-500 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
              )}
            </button>
          )}

          {/* Fiat methods via ZKP2P */}
          {FIAT_METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() => {
                if (method.id === "card") return; // Coming soon
                if (!hasValidAmount) {
                  setError("Enter an amount first");
                  return;
                }
                handleFiatPayment(method.id);
              }}
              disabled={!method.available || paying}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-lg">
                {method.icon}
              </div>
              <div className="flex-1 text-left">
                <span className="text-white/80 text-sm font-medium block">
                  {method.name}
                </span>
                <span className="text-white/30 text-xs">
                  {method.available ? method.description : "Coming soon"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/30 transition-colors" />
            </button>
          ))}

          {/* Crypto Wallet */}
          <button
            onClick={() => {
              if (!hasValidAmount) {
                setError("Enter an amount first");
                return;
              }
              setSelectedMethod("crypto");
            }}
            disabled={paying}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.08] transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-white/40" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-white/80 text-sm font-medium block">
                Crypto Wallet
              </span>
              <span className="text-white/30 text-xs">
                MetaMask, Coinbase, etc.
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/30 transition-colors" />
          </button>

          {/* Login prompt — if not logged in, offer as low-priority option */}
          {!authenticated && (
            <button
              onClick={login}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-white/30" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-white/50 text-sm font-medium block">
                  Sign in to Plenmo
                </span>
                <span className="text-white/25 text-xs">
                  Pay from your Plenmo balance
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/25 transition-colors" />
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-start gap-3 p-3.5 rounded-xl bg-red-500/8 border border-red-500/15">
            <AlertCircle className="w-4 h-4 text-red-400/80 flex-shrink-0 mt-0.5" />
            <p className="text-red-300/80 text-sm">{error}</p>
          </div>
        )}

        {/* Insufficient balance warning */}
        {authenticated &&
          balance &&
          hasValidAmount &&
          !hasSufficientBalance && (
            <p className="text-white/30 text-xs text-center mt-4">
              Your Plenmo balance (${balance}) is less than ${displayAmount}.
              Choose another method above.
            </p>
          )}

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-white/20 text-xs">
            Zero fees &middot; Instant &middot; Powered by Plenmo
          </p>
          {paymentLink.expiresAt && (
            <p className="text-white/15 text-xs">
              Expires {new Date(paymentLink.expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Crypto Wallet Expanded Panel */}
        {selectedMethod === "crypto" && paymentLink && (
          <CryptoWalletPanel
            recipientAddress={paymentLink.creatorAddress}
            amount={amount || paymentLink.amount?.toString() || "0"}
            onClose={() => setSelectedMethod(null)}
          />
        )}
      </div>
    </main>
  );
}

/**
 * Crypto Wallet Panel — simplified external wallet payment
 * Shows wallet address + MetaMask deep link
 */
function CryptoWalletPanel({
  recipientAddress,
  amount,
  onClose,
}: {
  recipientAddress: string;
  amount: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(async () => {
    await navigator.clipboard.writeText(recipientAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [recipientAddress]);

  const amountInWei = (() => {
    try {
      return parseUnits(amount, 6).toString();
    } catch {
      return "0";
    }
  })();

  const metamaskLink = `https://metamask.app.link/send/${USDT0_ADDRESS}@98866/transfer?address=${recipientAddress}&uint256=${amountInWei}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm clay-card p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white text-sm font-heading font-semibold">
            Pay with Crypto Wallet
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/50 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3">
          {/* Amount */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
            <span className="text-white/40 text-sm">Amount</span>
            <span className="text-white text-sm font-medium tabular-nums">
              ${amount} USDT0
            </span>
          </div>

          {/* Address */}
          <div className="p-3 rounded-xl bg-white/[0.03]">
            <span className="text-white/40 text-xs block mb-1.5">Send to</span>
            <div className="flex items-center gap-2">
              <code className="text-white/70 text-xs font-mono flex-1 break-all">
                {recipientAddress}
              </code>
              <button
                onClick={copyAddress}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/8 text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
              >
                {copied ? (
                  <CheckCircle className="w-3.5 h-3.5 text-plenmo-500" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
            <span className="text-white/40 text-sm">Network</span>
            <span className="text-white/60 text-sm">Plasma Chain</span>
          </div>

          {/* MetaMask deep link */}
          <a
            href={metamaskLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 border border-white/[0.06] text-white/70 text-sm font-medium hover:bg-white/8 transition-colors"
          >
            Open in MetaMask
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <p className="text-white/20 text-xs text-center mt-4">
          Send USDT0 on Plasma Chain (Chain ID: 98866)
        </p>
      </div>
    </div>
  );
}
