"use client";

/**
 * Claim Page - /claim/[token]
 * 
 * This page allows users to claim money that was sent to them
 * before they had a wallet. The sender provides a claim link,
 * and the recipient can sign up/login to claim the funds.
 */

import { useState, useEffect } from "react";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { Gift, Loader2, AlertCircle, CheckCircle, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

// Type for claim data
interface ClaimData {
  id: string;
  senderAddress: string;
  senderEmail?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  amount: number;
  currency: string;
  memo?: string;
  status: string;
  claimedBy?: string;
  claimedAt?: string;
  txHash?: string;
  expiresAt: string;
  createdAt: string;
}

export default function ClaimPage({
  params,
}: {
  params: { token: string };
}) {
  // In Next.js 14, params are synchronous (not a Promise)
  const token = params.token;

  // Wallet and auth state
  const { authenticated, ready, wallet, login } = usePlasmaWallet();

  // Page state
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch claim details
  useEffect(() => {
    if (!token) return;

    async function fetchClaim() {
      try {
        const response = await fetch(`/api/claims/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Claim not found");
          setLoading(false);
          return;
        }

        setClaim(data.claim);
      } catch (err) {
        setError("Failed to load claim");
      } finally {
        setLoading(false);
      }
    }

    fetchClaim();
  }, [token]);

  // Handle claim execution
  async function handleClaim() {
    if (!wallet || !token) return;

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimerAddress: wallet.address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Claim failed");
      }

      setSuccess(result.txHash);
      
      // Update local state
      setClaim(prev => prev ? {
        ...prev,
        status: 'claimed',
        claimedBy: wallet.address,
        txHash: result.txHash,
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  // Loading state
  if (loading || !ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[rgb(0,212,255)] animate-spin" />
          <span className="text-white/50">Loading your gift...</span>
        </div>
      </main>
    );
  }

  // Error state (no claim found)
  if (error && !claim) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Claim Error</h1>
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

  // Claim not found
  if (!claim) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Claim Not Found</h1>
          <p className="text-white/50 mb-6">This claim link is invalid or has been removed.</p>
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

  // Already claimed or success state
  if (claim.status === 'claimed' || success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full">
          <div className="liquid-glass rounded-3xl p-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Claimed!</h1>
            <p className="text-5xl font-bold gradient-text my-4">
              ${claim.amount}
            </p>
            <p className="text-white/50 mb-6">
              USDT0 has been added to your wallet
            </p>
            
            {(success || claim.txHash) && (
              <a
                href={`https://scan.plasma.to/tx/${success || claim.txHash}`}
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
  if (claim.status === 'expired') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Claim Expired</h1>
          <p className="text-white/50 mb-6">
            This claim has expired. The funds have been returned to the sender.
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

  // Main claim UI
  return (
    <main className="min-h-screen bg-black p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[40%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.15)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[10%] right-[30%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] blur-3xl" />
      </div>

      <div className="max-w-md mx-auto pt-12 relative z-10">
        {/* Gift Card */}
        <div className="liquid-glass-elevated rounded-3xl p-8 text-center">
          {/* Gift icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            You received money!
          </h1>
          
          {/* Sender info */}
          <p className="text-white/50 text-sm mb-6">
            From {claim.senderEmail || `${claim.senderAddress.slice(0, 6)}...${claim.senderAddress.slice(-4)}`}
          </p>

          {/* Amount */}
          <div className="my-8">
            <p className="text-6xl font-bold gradient-text">
              ${claim.amount}
            </p>
            <p className="text-white/40 text-lg mt-2">USDT0</p>
          </div>

          {/* Memo if present */}
          {claim.memo && (
            <div className="bg-white/5 rounded-2xl p-4 mb-6">
              <p className="text-white/70 text-sm italic">&ldquo;{claim.memo}&rdquo;</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Action button */}
          {!authenticated ? (
            <button
              onClick={login}
              className="w-full btn-primary text-lg py-4"
            >
              Sign up to Claim
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  Claim ${claim.amount} USDT0
                </>
              )}
            </button>
          )}

          {/* Info */}
          <p className="text-white/30 text-xs text-center mt-4">
            {authenticated ? "Claim to your wallet" : "Create a wallet to receive these funds"}
          </p>
        </div>

        {/* Expiration info */}
        <p className="text-white/30 text-xs text-center mt-4">
          Expires: {new Date(claim.expiresAt).toLocaleDateString()}
        </p>

        {/* Zero gas fees badge */}
        <div className="text-center mt-6">
          <span className="inline-flex items-center gap-2 text-white/40 text-sm px-4 py-2 rounded-full liquid-glass-subtle">
            <span className="w-2 h-2 rounded-full bg-[rgb(0,212,255)]" />
            Zero gas fees on Plasma Chain
          </span>
        </div>
      </div>
    </main>
  );
}

