"use client";

/**
 * RequestMoneyForm Component
 * 
 * Creates a shareable payment request link that users can send via DM/text/etc.
 */

import { useState } from "react";
import { Link2, Loader2, Copy, Check, Share2 } from "lucide-react";
import type { Address } from "viem";

interface RequestMoneyFormProps {
  walletAddress: Address | undefined;
  userEmail?: string;
  onSuccess?: () => void;
}

export function RequestMoneyForm({ walletAddress, onSuccess }: RequestMoneyFormProps) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestLink, setRequestLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const canSubmit = walletAddress && isValidAmount && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setRequestLink(null);

    try {
      const response = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress: walletAddress,
          amount,
          memo: memo || undefined,
          type: "request",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create request link");
      }

      const link = data.paymentLink?.url || `${window.location.origin}/pay/${data.paymentLink?.id}`;
      setRequestLink(link);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!requestLink) return;
    await navigator.clipboard.writeText(requestLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    if (!requestLink) return;
    if (navigator.share) {
      await navigator.share({
        title: `Pay me $${amount}`,
        text: memo ? `${memo} - $${amount}` : `Payment request for $${amount}`,
        url: requestLink,
      });
    } else {
      copyLink();
    }
  }

  function resetForm() {
    setAmount("");
    setMemo("");
    setRequestLink(null);
    setError(null);
  }

  if (requestLink) {
    return (
      <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-5">
        <h2 className="text-xl font-semibold text-white">Share Your Request</h2>
        
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm">
          Request link created for ${amount}
        </div>

        <div className="bg-white/5 rounded-xl p-4 break-all text-white/70 text-sm font-mono">
          {requestLink}
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyLink}
            aria-label="Copy payment request link"
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={shareLink}
            aria-label="Share payment request"
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>

        <button
          onClick={resetForm}
          className="w-full text-white/50 hover:text-white/70 text-sm py-2 transition-colors"
        >
          Create another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="liquid-glass rounded-3xl p-6 md:p-8 space-y-5"
    >
      <h2 className="text-xl font-semibold text-white">Request Money</h2>

      <div>
        <label htmlFor="request-amount" className="block text-white/50 text-sm mb-2 font-medium">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true">
            $
          </span>
          <input
            id="request-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            aria-label="Payment request amount in USD"
            className="input-glass w-full pl-8"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="request-memo" className="block text-white/50 text-sm mb-2 font-medium">
          What for? (optional)
        </label>
        <input
          id="request-memo"
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Dinner, rent, etc."
          aria-label="Payment memo or description"
          className="input-glass w-full"
          disabled={loading}
        />
      </div>

      {error && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Link2 className="w-5 h-5" />
            Create Request Link
          </>
        )}
      </button>

      <p className="text-white/30 text-xs text-center">
        Share the link via text, DM, or any messaging app
      </p>
    </form>
  );
}

