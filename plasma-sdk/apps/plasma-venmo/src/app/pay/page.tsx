"use client";

/**
 * Pay Page - /pay?to=address&amount=X&memo=Y
 * 
 * This page handles direct payments to a wallet address.
 * Used by QR codes and direct payment links.
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { parseUnits } from "viem";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, ExternalLink, User } from "lucide-react";
import Link from "next/link";
import { createTransferParams, buildTransferAuthorizationTypedData } from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";
import { Avatar } from "@/components/ui/Avatar";
import { splitSignature, isValidAddress } from "@/lib/crypto";

function PayPageContent() {
  const searchParams = useSearchParams();
  const to = searchParams.get("to");
  const prefilledAmount = searchParams.get("amount");
  const memo = searchParams.get("memo");

  const { authenticated, ready, wallet, login } = usePlasmaWallet();
  const { formatted: balance } = useUSDT0Balance();

  const [amount, setAmount] = useState(prefilledAmount || "");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validate recipient address
  const addressIsValid = to && isValidAddress(to);
  const isValidAmount = parseFloat(amount) > 0;
  const numericBalance = parseFloat(balance || "0");
  const numericAmount = parseFloat(amount || "0");
  const insufficientBalance = numericAmount > 0 && numericAmount > numericBalance;

  async function handlePay() {
    if (!wallet || !to || !amount || paying) return;

    setPaying(true);
    setError(null);

    try {
      const amountInUnits = parseUnits(amount, 6);

      const params = createTransferParams(
        wallet.address,
        to as `0x${string}`,
        amountInUnits
      );

      const typedData = buildTransferAuthorizationTypedData(params, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      const signature = await wallet.signTypedData(typedData);
      const { v, r, s } = splitSignature(signature);

      const response = await fetch("/api/submit-transfer", {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  // Loading state
  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[rgb(0,212,255)] animate-spin" />
          <span className="text-white/50">Loading...</span>
        </div>
      </main>
    );
  }

  // Invalid recipient
  if (!addressIsValid) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Payment Link</h1>
          <p className="text-white/50 mb-6">
            {to ? "The wallet address is invalid." : "No recipient specified."}
          </p>
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

  // Success state
  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full">
          <div className="liquid-glass rounded-3xl p-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Payment Sent!</h1>
            <p className="text-5xl font-bold gradient-text my-4">${amount}</p>
            <p className="text-white/50 mb-6">USDT0 sent successfully</p>
            
            <a
              href={`https://scan.plasma.to/tx/${success}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline mb-6"
            >
              View on Plasma Scan
              <ExternalLink className="w-4 h-4" />
            </a>
            
            <div className="mt-6">
              <Link href="/" className="btn-primary inline-block">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Main payment UI
  const canPay = authenticated && wallet && isValidAmount && !insufficientBalance && !paying;

  return (
    <main className="min-h-screen bg-black p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.1)_0%,transparent_70%)] blur-3xl" />
      </div>

      <div className="max-w-md mx-auto pt-8 relative z-10">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="liquid-glass-elevated rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Send Payment</h1>
          
          {/* Recipient */}
          <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 mb-6">
            <Avatar name={to} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-sm">To</p>
              <p className="text-white font-mono text-sm truncate">{to}</p>
            </div>
          </div>

          {/* Memo if present */}
          {memo && (
            <div className="bg-white/5 rounded-2xl p-4 mb-6">
              <p className="text-white/50 text-sm mb-1">For</p>
              <p className="text-white">{decodeURIComponent(memo)}</p>
            </div>
          )}

          {/* Amount input */}
          <div className="mb-6">
            <label className="block text-white/50 text-sm mb-2">Amount (USDT0)</label>
            {prefilledAmount ? (
              <div className="text-5xl font-bold tracking-tight">
                <span className="gradient-text">${prefilledAmount}</span>
                <span className="text-white/30 text-xl ml-2">USDT0</span>
              </div>
            ) : (
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

          {/* Balance info */}
          {authenticated && balance && (
            <div className="text-white/40 text-sm mb-4">
              Your balance: ${balance} USDT0
            </div>
          )}

          {/* Insufficient balance warning */}
          {insufficientBalance && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl px-4 py-3 text-sm mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Insufficient balance</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-sm mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Action button */}
          {!authenticated ? (
            <button onClick={login} className="w-full btn-primary">
              Login to Pay
            </button>
          ) : (
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
                <>Pay {amount ? `$${amount}` : ""} USDT0</>
              )}
            </button>
          )}

          <p className="text-white/30 text-xs text-center mt-4">
            Zero gas fees on Plasma Chain
          </p>
        </div>
      </div>
    </main>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-12 h-12 text-[rgb(0,212,255)] animate-spin" />
      </main>
    }>
      <PayPageContent />
    </Suspense>
  );
}
