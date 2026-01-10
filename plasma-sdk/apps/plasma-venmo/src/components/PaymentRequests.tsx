"use client";

/**
 * PaymentRequests Component
 * 
 * Displays incoming payment requests that the user needs to pay or decline.
 */

import { useState, useEffect } from "react";
import { HandCoins, Check, X, Loader2, ExternalLink } from "lucide-react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import type { PlasmaEmbeddedWallet } from "@plasma-pay/privy-auth";
import { createTransferParams, buildTransferAuthorizationTypedData } from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";

// Type for payment request
interface PaymentRequest {
  id: string;
  fromAddress: string;
  fromEmail?: string;
  toIdentifier: string;
  amount: number;
  currency: string;
  memo?: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface PaymentRequestsProps {
  wallet: PlasmaEmbeddedWallet | null;
  userEmail?: string;
  onRefresh?: () => void;
}

// Helper to split signature
function splitSignature(signature: `0x${string}`): { v: number; r: `0x${string}`; s: `0x${string}` } {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

export function PaymentRequests({ wallet, userEmail, onRefresh }: PaymentRequestsProps) {
  // State
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  // Fetch incoming requests
  useEffect(() => {
    if (!wallet?.address) {
      setRequests([]);
      setLoading(false);
      return;
    }

    async function fetchRequests() {
      if (!wallet?.address) return;
      
      setLoading(true);
      try {
        let url = `/api/requests?address=${wallet.address}&type=received`;
        if (userEmail) {
          url += `&email=${encodeURIComponent(userEmail)}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setRequests(data.requests?.received || []);
        }
      } catch {
        // Silent fail - empty list will be shown
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, [wallet?.address, userEmail]);

  // Pay a request
  async function payRequest(request: PaymentRequest) {
    if (!wallet) return;

    setPayingId(request.id);
    try {
      // Parse amount to smallest units
      const amountInUnits = parseUnits(request.amount.toString(), 6);

      // Create transfer params
      const params = createTransferParams(
        wallet.address,
        request.fromAddress as `0x${string}`,
        amountInUnits
      );

      // Build typed data
      const typedData = buildTransferAuthorizationTypedData(params, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      // Sign
      const signature = await wallet.signTypedData(typedData);
      const { v, r, s } = splitSignature(signature);

      // Submit
      const response = await fetch(`/api/requests/${request.id}`, {
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

      if (response.ok) {
        // Remove from list
        setRequests(requests.filter(r => r.id !== request.id));
        onRefresh?.();
      }
    } catch {
      // Silent fail - request stays in list
    } finally {
      setPayingId(null);
    }
  }

  // Decline a request
  async function declineRequest(request: PaymentRequest) {
    if (!wallet) return;

    setDecliningId(request.id);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declinerAddress: wallet.address,
          declinerEmail: userEmail,
        }),
      });

      if (response.ok) {
        // Remove from list
        setRequests(requests.filter(r => r.id !== request.id));
      }
    } catch {
      // Silent fail - request stays in list
    } finally {
      setDecliningId(null);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="liquid-glass rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4">Pending Requests</h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 liquid-glass-subtle rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // No requests
  if (requests.length === 0) {
    return null; // Don't show empty state for requests
  }

  return (
    <div className="liquid-glass rounded-3xl p-6 md:p-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <HandCoins className="w-5 h-5 text-[rgb(0,212,255)]" />
        Pending Requests
        <span className="text-sm bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </h2>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="p-4 liquid-glass-subtle rounded-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-2xl gradient-text">
                    ${request.amount}
                  </span>
                  <span className="text-white/40 text-sm">USDT0</span>
                </div>
                
                <p className="text-white/60 text-sm mt-1">
                  Requested by {request.fromEmail || `${request.fromAddress.slice(0, 6)}...${request.fromAddress.slice(-4)}`}
                </p>
                
                {request.memo && (
                  <p className="text-white/40 text-sm mt-1 italic">
                    &ldquo;{request.memo}&rdquo;
                  </p>
                )}
                
                <p className="text-white/30 text-xs mt-2">
                  Expires {new Date(request.expiresAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => declineRequest(request)}
                  disabled={decliningId === request.id || payingId === request.id}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                  title="Decline"
                >
                  {decliningId === request.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                </button>
                
                <button
                  onClick={() => payRequest(request)}
                  disabled={payingId === request.id || decliningId === request.id}
                  className="p-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors disabled:opacity-50"
                  title="Pay"
                >
                  {payingId === request.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

