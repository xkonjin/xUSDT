"use client";

/**
 * SentRequests Component
 * 
 * Displays payment requests the user has sent to others.
 * Includes a "Resend Notification" button for pending requests.
 */

import { useState, useEffect } from "react";
import { Send, Clock, AlertCircle, RefreshCw, Loader2, Check, Mail, MailCheck } from "lucide-react";
import type { Address } from "viem";
import { Avatar } from "./ui/Avatar";
import { RequestSkeleton } from "./ui/Skeleton";
import { formatRelativeTime } from "@/lib/utils";

interface SentRequest {
  id: string;
  toIdentifier: string;
  toAddress?: string;
  amount: number;
  currency: string;
  memo?: string;
  status: string;
  expiresAt: string;
  paidAt?: string;
  txHash?: string;
  createdAt: string;
}

interface SentRequestsProps {
  walletAddress: Address | undefined;
  onRefresh?: () => void;
}

export function SentRequests({ walletAddress, onRefresh }: SentRequestsProps) {
  const [requests, setRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  // Fetch sent requests
  const fetchRequests = async () => {
    if (!walletAddress) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/requests?address=${walletAddress}&type=sent`);
      if (!response.ok) {
        throw new Error("Failed to load requests");
      }
      const data = await response.json();
      setRequests(data.requests?.sent || []);
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
  }, [walletAddress]);

  // Resend notification
  async function resendNotification(request: SentRequest) {
    if (!walletAddress) return;

    setResendingId(request.id);
    setResendSuccess(null);
    try {
      const response = await fetch(`/api/requests/${request.id}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderAddress: walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to resend notification");
      }

      setResendSuccess(request.id);
      setTimeout(() => setResendSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend notification");
      setTimeout(() => setError(null), 5000);
    } finally {
      setResendingId(null);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="clay-card p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2 font-heading">
          <Send className="w-5 h-5 text-plenmo-500" />
          Sent Requests
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
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2 font-heading">
          <Send className="w-5 h-5 text-plenmo-500" />
          Sent Requests
        </h2>
        <div className="flex flex-col items-center gap-3 py-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-400 text-sm font-body">{error}</p>
          <button
            onClick={fetchRequests}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors font-body"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No requests - show empty state
  if (requests.length === 0) {
    return null; // Don't show section if no sent requests
  }

  // Filter to only pending requests for this view
  const pendingRequests = requests.filter(r => r.status === 'pending');
  
  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="clay-card p-6 md:p-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2 font-heading">
        <Send className="w-5 h-5 text-plenmo-500" />
        Sent Requests
        <span className="text-sm bg-plenmo-500/20 text-plenmo-500 px-2 py-0.5 rounded-full font-body">
          {pendingRequests.length}
        </span>
      </h2>

      <div className="space-y-3">
        {pendingRequests.map((request) => {
          const recipientName = request.toIdentifier;
          const isEmail = request.toIdentifier.includes('@');
          const canResend = request.status === 'pending' && isEmail;
          
          return (
            <div
              key={request.id}
              className="p-4 bg-white/5 rounded-2xl hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar name={recipientName} size="lg" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-xl text-white font-heading">
                      ${request.amount}
                    </span>
                    <span className="text-white/40 text-sm font-body">USDT0</span>
                  </div>
                  
                  <p className="text-white/60 text-sm truncate font-body">
                    To: {request.toIdentifier}
                  </p>
                  
                  {request.memo && (
                    <p className="text-white/40 text-xs mt-1 truncate italic font-body">
                      &ldquo;{request.memo}&rdquo;
                    </p>
                  )}
                </div>

                {/* Resend button */}
                {canResend && (
                  <button
                    onClick={() => resendNotification(request)}
                    disabled={resendingId === request.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all font-body ${
                      resendSuccess === request.id
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 hover:bg-plenmo-500/20 text-white/70 hover:text-plenmo-400'
                    }`}
                    aria-label={`Resend notification for $${request.amount} request`}
                  >
                    {resendingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : resendSuccess === request.id ? (
                      <>
                        <MailCheck className="w-4 h-4" />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Resend
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-1 mt-3 text-white/30 text-xs font-body">
                <Clock className="w-3 h-3" />
                <span>Expires {formatRelativeTime(request.expiresAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-white/30 text-xs text-center mt-4 font-body">
        Recipients will receive an email reminder when you click Resend
      </p>
    </div>
  );
}
