"use client";

/**
 * PaymentRequests Component
 * 
 * Displays incoming payment requests that the user needs to pay or decline.
 */

import { useState, useEffect } from "react";
import { HandCoins, X, Loader2, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { parseUnits } from "viem";
import type { PlasmaEmbeddedWallet } from "@plasma-pay/privy-auth";
import { createTransferParams, buildTransferAuthorizationTypedData } from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";
import { Avatar } from "./ui/Avatar";
import { RequestSkeleton } from "./ui/Skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { splitSignature } from "@/lib/crypto";

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

export function PaymentRequests({ wallet, userEmail, onRefresh }: PaymentRequestsProps) {
  // State
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch incoming requests
  const fetchRequests = async () => {
    if (!wallet?.address) {
      setRequests([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      let url = `/api/requests?address=${wallet.address}&type=received`;
      if (userEmail) {
        url += `&email=${encodeURIComponent(userEmail)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to load requests");
      }
      const data = await response.json();
      setRequests(data.requests?.received || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address, userEmail]);

  // Clear action error after timeout
  useEffect(() => {
    if (actionError) {
      const timeout = setTimeout(() => setActionError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [actionError]);

  // Pay a request
  async function payRequest(request: PaymentRequest) {
    if (!wallet) return;

    setPayingId(request.id);
    setActionError(null);
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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Payment failed");
      }

      // Remove from list
      setRequests(requests.filter(r => r.id !== request.id));
      onRefresh?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setPayingId(null);
    }
  }

  // Decline a request
  async function declineRequest(request: PaymentRequest) {
    if (!wallet) return;

    setDecliningId(request.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declinerAddress: wallet.address,
          declinerEmail: userEmail,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to decline request");
      }

      // Remove from list
      setRequests(requests.filter(r => r.id !== request.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to decline. Please try again.");
    } finally {
      setDecliningId(null);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="clay-card p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-plenmo-500" />
          Pending Requests
        </h2>
        <div className="space-y-3">
          <RequestSkeleton />
          <RequestSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="clay-card p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-plenmo-500" />
          Pending Requests
        </h2>
        <div className="flex flex-col items-center gap-3 py-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchRequests}
            className="clay-button clay-button-ghost flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No requests
  if (requests.length === 0) {
    return null; // Don't show empty state for requests
  }

  return (
    <div className="clay-card p-6 md:p-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <HandCoins className="w-5 h-5 text-plenmo-500" />
        Pending Requests
        <span className="clay-badge clay-badge-success">
          {requests.length}
        </span>
      </h2>

      {/* Action error alert */}
      {actionError && (
        <div className="mb-4 clay-alert clay-alert-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {actionError}
        </div>
      )}

      <div className="space-y-3">
        {requests.map((request) => {
          const requesterName = request.fromEmail || request.fromAddress;
          
          return (
            <div
              key={request.id}
              className="clay-list-item"
            >
              <div className="flex items-center gap-4">
                <Avatar name={requesterName} size="lg" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-xl text-white">
                      ${request.amount}
                    </span>
                    <span className="text-white/40 text-sm">USDT0</span>
                  </div>
                  
                  <p className="text-white/60 text-sm truncate">
                    {request.fromEmail || `${request.fromAddress.slice(0, 6)}...${request.fromAddress.slice(-4)}`}
                  </p>
                  
                  {request.memo && (
                    <p className="text-white/40 text-xs mt-1 truncate italic">
                      &ldquo;{request.memo}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => declineRequest(request)}
                    disabled={decliningId === request.id || payingId === request.id}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label={`Decline payment request for $${request.amount}`}
                  >
                    {decliningId === request.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <X className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => payRequest(request)}
                    disabled={payingId === request.id || decliningId === request.id}
                    className="px-4 py-2.5 rounded-xl bg-[rgb(0,212,255)] hover:bg-[rgb(0,190,230)] text-black font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    aria-label={`Pay $${request.amount} to ${request.fromEmail || request.fromAddress}`}
                  >
                    {payingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <>Pay</>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-1 mt-3 text-white/30 text-xs">
                <Clock className="w-3 h-3" />
                <span>Expires {formatRelativeTime(request.expiresAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

