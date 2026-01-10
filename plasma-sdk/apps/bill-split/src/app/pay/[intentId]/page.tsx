"use client";

/**
 * Universal Payment Page
 * 
 * Allows users to pay a bill split share.
 * For MVP, uses Plasma gasless transfers (like the existing bill pay page).
 * 
 * Future enhancement: Add wagmi for multi-chain wallet support.
 * 
 * Flow:
 * 1. User opens page via QR code or link
 * 2. Connects wallet via Privy
 * 3. Signs gasless transfer
 * 4. Payment is relayed to Plasma chain
 */

import { useState, useEffect } from "react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { parseUnits } from "viem";
import {
  Loader2,
  Wallet,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { createTransferParams, buildTransferAuthorizationTypedData } from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";

// ============================================================================
// TYPES
// ============================================================================

interface PaymentIntentData {
  id: string;
  amountUsd: number;
  recipientAddress: string;
  billTitle: string;
  participantName: string;
  status: string;
  expiresAt: string;
  destTxHash?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Split an EIP-712 signature into v, r, s components
 */
function splitSignature(signature: `0x${string}`): { v: number; r: `0x${string}`; s: `0x${string}` } {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function PaymentPage({
  params,
}: {
  params: { intentId: string };
}) {
  const intentId = params.intentId;

  // Wallet state from Privy
  const { authenticated, ready, wallet, login } = usePlasmaWallet();
  const { formatted: balance } = useUSDT0Balance();

  // Page state
  const [intentData, setIntentData] = useState<PaymentIntentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch payment intent data from API
   */
  useEffect(() => {
    async function fetchIntent() {
      try {
        const response = await fetch(`/api/pay/${intentId}`);
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Payment not found");
          return;
        }
        const data = await response.json();
        setIntentData(data.intent);

        // Check if already paid
        if (data.intent.status === "completed") {
          setSuccess(data.intent.destTxHash || "paid");
        }
      } catch (err) {
        setError("Failed to load payment");
      } finally {
        setLoading(false);
      }
    }

    if (intentId) {
      fetchIntent();
    }
  }, [intentId]);

  // ============================================================================
  // PAYMENT HANDLING
  // ============================================================================

  /**
   * Handle gasless payment on Plasma chain
   */
  async function handlePay() {
    if (!wallet || !intentData) return;

    setPaying(true);
    setError(null);

    try {
      // Parse amount (6 decimals for USDT0)
      const amountInUnits = parseUnits(intentData.amountUsd.toFixed(6), 6);

      // Create transfer params for EIP-3009 authorization
      const params = createTransferParams(
        wallet.address as `0x${string}`,
        intentData.recipientAddress as `0x${string}`,
        amountInUnits
      );

      // Build typed data for signing
      const typedData = buildTransferAuthorizationTypedData(params, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      // Sign the authorization
      const signature = await wallet.signTypedData(typedData);
      const { v, r, s } = splitSignature(signature);

      // Submit to relay API (updates the payment intent)
      const response = await fetch(`/api/pay/${intentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerAddress: wallet.address,
          // For direct Plasma payment, include gasless auth params
          gaslessAuth: {
            from: params.from,
            to: params.to,
            value: params.value.toString(),
            validAfter: params.validAfter,
            validBefore: params.validBefore,
            nonce: params.nonce,
            v,
            r,
            s,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Also submit to relay endpoint
      const relayResponse = await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const relayResult = await relayResponse.json();

      if (relayResult.txHash) {
        // Update the payment intent with the tx hash
        await fetch(`/api/pay/${intentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payerAddress: wallet.address,
            destTxHash: relayResult.txHash,
            sourceTxHash: relayResult.txHash,
            sourceChainId: PLASMA_MAINNET_CHAIN_ID,
            sourceToken: USDT0_ADDRESS,
            bridgeProvider: 'direct',
          }),
        });

        setSuccess(relayResult.txHash);
        setIntentData(prev => prev ? {
          ...prev,
          status: 'completed',
          destTxHash: relayResult.txHash,
        } : null);
      } else {
        throw new Error(relayResult.error || 'Relay failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (loading || !ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin" />
      </main>
    );
  }

  // Error state
  if (error && !intentData) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Payment Not Found</h1>
          <p className="text-white/50">{error}</p>
        </div>
      </main>
    );
  }

  // Success state
  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Complete!</h1>
          <p className="text-4xl font-bold gradient-text my-4">
            ${intentData?.amountUsd.toFixed(2)}
          </p>
          <p className="text-white/50 mb-6">
            for {intentData?.billTitle}
          </p>
          {success !== "paid" && (
            <a
              href={`https://scan.plasma.to/tx/${success}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline"
            >
              View on Explorer
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </main>
    );
  }

  if (!intentData) return null;

  // Main payment UI
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🧾</div>
          <h1 className="text-2xl font-bold text-white mb-2">Pay Your Share</h1>
          <p className="text-white/50">{intentData.billTitle}</p>
        </div>

        {/* Amount Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[rgb(0,212,255)]/20 to-purple-500/20 border border-white/10 mb-6">
          <p className="text-white/50 text-sm mb-1">Amount Due</p>
          <p className="text-4xl font-bold gradient-text">
            ${intentData.amountUsd.toFixed(2)}
          </p>
          <p className="text-white/40 text-sm mt-2">
            Hi {intentData.participantName}!
          </p>
        </div>

        {/* Payment Section */}
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
          {!authenticated ? (
            // Not connected - show login button
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/50 mb-6">
                Connect your wallet to pay
              </p>
              <button
                onClick={login}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-[rgb(0,212,255)] to-purple-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[rgb(0,212,255)]/20 transition-all"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </button>
            </div>
          ) : (
            // Connected - show pay button
            <div className="space-y-4">
              {/* Wallet info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[rgb(0,212,255)]/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[rgb(0,212,255)]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}
                    </p>
                    <p className="text-white/40 text-sm">Plasma Chain</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-sm">Balance</p>
                  <p className="text-white font-medium">${balance} USDT0</p>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-[rgb(0,212,255)] to-purple-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[rgb(0,212,255)]/20 transition-all"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Pay ${intentData.amountUsd.toFixed(2)} USDT0
                  </>
                )}
              </button>

              {/* Zero gas note */}
              <p className="text-center text-white/30 text-xs">
                Zero gas fees on Plasma Chain
              </p>
            </div>
          )}
        </div>

        {/* Info about cross-chain */}
        <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-white/50 text-sm text-center">
            💡 Cross-chain payments from other networks coming soon!
          </p>
        </div>
      </div>
    </main>
  );
}
