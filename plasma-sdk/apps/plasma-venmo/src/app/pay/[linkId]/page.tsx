"use client";

/**
 * Pay Page - /pay/[linkId]
 * 
 * This page allows anyone to pay a payment link.
 * Shows the payment details and allows the user to:
 * 1. Login with Privy (if not authenticated)
 * 2. Enter amount (if link doesn't have fixed amount)
 * 3. Sign and submit the payment
 */

import { useState, useEffect } from "react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { parseUnits } from "viem";
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createTransferParams, buildTransferAuthorizationTypedData } from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";
import { ExternalWalletPayButton } from "@/components/ExternalWalletPay";

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

// Helper to split signature into v, r, s components
function splitSignature(signature: `0x${string}`): { v: number; r: `0x${string}`; s: `0x${string}` } {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

export default function PayPage({
  params,
}: {
  params: { linkId: string };
}) {
  // In Next.js 14, params are synchronous (not a Promise)
  const linkId = params.linkId;

  // Wallet and auth state
  const { user, authenticated, ready, wallet, login } = usePlasmaWallet();
  const { formatted: balance } = useUSDT0Balance();

  // Page state
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError("Failed to load payment link");
      } finally {
        setLoading(false);
      }
    }

    fetchLink();
  }, [linkId]);

  // Handle payment submission
  async function handlePay() {
    if (!wallet || !paymentLink || !amount) return;

    setPaying(true);
    setError(null);

    try {
      // Parse amount to smallest units (6 decimals for USDT0)
      const amountInUnits = parseUnits(amount, 6);

      // Create transfer params
      const params = createTransferParams(
        wallet.address,
        paymentLink.creatorAddress as `0x${string}`,
        amountInUnits
      );

      // Build EIP-712 typed data
      const typedData = buildTransferAuthorizationTypedData(params, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      // Sign the typed data
      const signature = await wallet.signTypedData(typedData);
      const { v, r, s } = splitSignature(signature);

      // Submit to API
      const response = await fetch(`/api/payment-links/${linkId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: params.from,
          to: params.to,
          value: params.value.toString(),
          validAfter: params.validAfter,
          validBefore: params.validBefore,
          nonce: params.nonce,
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
      
      // Update local state
      setPaymentLink(prev => prev ? {
        ...prev,
        status: 'paid',
        paidBy: wallet.address,
        txHash: result.txHash,
      } : null);
    } catch (err) {
      const rawError = err instanceof Error ? err.message : "Payment failed";
      setError(parseUserFriendlyError(rawError, amount));
    } finally {
      setPaying(false);
    }
  }

  // Convert technical errors to user-friendly messages
  function parseUserFriendlyError(error: string, payAmount: string): string {
    const lowerError = error.toLowerCase();
    
    // Insufficient balance
    if (lowerError.includes('exceeds balance') || lowerError.includes('insufficient')) {
      return `You don't have enough USDT0. You need $${payAmount} but only have $${balance || '0'}.`;
    }
    
    // User rejected/cancelled
    if (lowerError.includes('rejected') || lowerError.includes('denied') || lowerError.includes('cancelled')) {
      return 'Transaction was cancelled.';
    }
    
    // Network issues
    if (lowerError.includes('network') || lowerError.includes('timeout') || lowerError.includes('connection')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Invalid signature
    if (lowerError.includes('signature') || lowerError.includes('invalid')) {
      return 'Something went wrong signing the transaction. Please try again.';
    }
    
    // Contract revert (generic)
    if (lowerError.includes('revert') || lowerError.includes('contract')) {
      if (lowerError.includes('erc20')) {
        return `You don't have enough USDT0 to complete this payment.`;
      }
      return 'Transaction failed. Please try again or use an external wallet.';
    }
    
    // Fallback - don't show technical details
    if (error.length > 100 || error.includes('0x')) {
      return 'Payment failed. Please try again or use an external wallet.';
    }
    
    return error;
  }

  // Loading state
  if (loading || !ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[rgb(0,212,255)] animate-spin" />
          <span className="text-white/50">Loading payment link...</span>
        </div>
      </main>
    );
  }

  // Error state
  if (error && !paymentLink) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Payment Link Error</h1>
          <p className="text-white/50 mb-6">{error}</p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Plenmo
          </Link>
        </div>
      </main>
    );
  }

  // Link not found
  if (!paymentLink) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Link Not Found</h1>
          <p className="text-white/50 mb-6">This payment link doesn&apos;t exist or has been removed.</p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Plenmo
          </Link>
        </div>
      </main>
    );
  }

  // Already paid state
  if (paymentLink.status === 'paid' || success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full">
          <div className="liquid-glass rounded-3xl p-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Payment Complete!</h1>
            <p className="text-white/50 mb-6">
              {paymentLink.amount !== null 
                ? `$${paymentLink.amount} USDT0 sent successfully`
                : `Payment sent successfully`
              }
            </p>
            
            {(success || paymentLink.txHash) && (
              <a
                href={`https://scan.plasma.to/tx/${success || paymentLink.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline mb-6"
              >
                View on Plasma Scan
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            
            <div className="mt-6">
              <Link 
                href="/"
                className="btn-primary inline-block"
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
  if (paymentLink.status === 'expired') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
          <p className="text-white/50 mb-6">This payment link has expired and can no longer be used.</p>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Plenmo
          </Link>
        </div>
      </main>
    );
  }

  // Main payment UI
  const isValidAmount = parseFloat(amount) > 0;
  const canPay = authenticated && wallet && isValidAmount && !paying;

  return (
    <main className="min-h-screen bg-black p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.1)_0%,transparent_70%)] blur-3xl" />
      </div>

      <div className="max-w-md mx-auto pt-8 relative z-10">
        {/* Header */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plenmo
        </Link>

        {/* Payment Card */}
        <div className="liquid-glass-elevated rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Payment Request</h1>
          
          {/* Recipient info */}
          <div className="flex items-center gap-2 text-white/50 text-sm mb-6">
            <span>To:</span>
            <span className="font-mono">
              {paymentLink.creatorAddress.slice(0, 6)}...{paymentLink.creatorAddress.slice(-4)}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(paymentLink.creatorAddress)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>

          {/* Memo if present */}
          {paymentLink.memo && (
            <div className="bg-white/5 rounded-2xl p-4 mb-6">
              <p className="text-white/70 text-sm">&ldquo;{paymentLink.memo}&rdquo;</p>
            </div>
          )}

          {/* Amount section */}
          <div className="mb-6">
            <label className="block text-white/50 text-sm mb-2 font-medium">
              Amount (USDT0)
            </label>
            {paymentLink.amount !== null ? (
              // Fixed amount display
              <div className="text-5xl font-bold tracking-tight">
                <span className="gradient-text">${paymentLink.amount}</span>
                <span className="text-white/30 text-xl ml-2">USDT0</span>
              </div>
            ) : (
              // Editable amount input
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-2xl">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="input-glass w-full pl-10 text-2xl font-bold"
                  disabled={paying}
                />
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-200 text-sm font-medium">{error}</p>
                  {error.includes("enough") && (
                    <p className="text-white/50 text-xs mt-2">
                      You can add funds or pay with an external wallet below.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Balance info (if authenticated) */}
          {authenticated && balance && (
            <div className="text-white/40 text-sm mb-4">
              Your balance: ${balance} USDT0
            </div>
          )}

          {/* Action button */}
          {!authenticated ? (
            <div className="space-y-3">
              <button
                onClick={login}
                className="w-full btn-primary"
              >
                Login to Pay
              </button>
              
              {/* Alternative: External wallet */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-[#0a0a0a] text-white/40">or</span>
                </div>
              </div>
              
              <ExternalWalletPayButton
                recipientAddress={paymentLink.creatorAddress}
                amount={paymentLink.amount?.toString() || amount}
                memo={paymentLink.memo}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handlePay}
                disabled={!canPay}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay {amount ? `$${amount}` : ''} USDT0</>
                )}
              </button>
              
              {/* Show external wallet option if balance is insufficient */}
              {balance && parseFloat(balance) < parseFloat(amount || '0') && (
                <>
                  <p className="text-amber-400/80 text-xs text-center">
                    Insufficient balance. You can also pay with an external wallet:
                  </p>
                  <ExternalWalletPayButton
                    recipientAddress={paymentLink.creatorAddress}
                    amount={paymentLink.amount?.toString() || amount}
                    memo={paymentLink.memo}
                  />
                </>
              )}
            </div>
          )}

          {/* Zero gas fees badge */}
          <p className="text-white/30 text-xs text-center mt-4">
            Zero gas fees on Plasma Chain
          </p>
        </div>

        {/* Expiration info */}
        {paymentLink.expiresAt && (
          <p className="text-white/30 text-xs text-center mt-4">
            Expires: {new Date(paymentLink.expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </main>
  );
}

