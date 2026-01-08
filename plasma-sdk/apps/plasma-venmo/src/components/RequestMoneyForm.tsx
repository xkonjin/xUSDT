"use client";

/**
 * RequestMoneyForm Component
 * 
 * Allows users to request money from others by email, phone, or wallet address.
 */

import { useState } from "react";
import { HandCoins, Loader2 } from "lucide-react";
import type { Address } from "viem";

interface RequestMoneyFormProps {
  walletAddress: Address | undefined;
  userEmail?: string;
  onSuccess?: () => void;
}

export function RequestMoneyForm({ walletAddress, userEmail, onSuccess }: RequestMoneyFormProps) {
  // Form state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validation
  const isValidRecipient = recipient.includes("@") || /^\+?\d{10,}$/.test(recipient) || 
    (recipient.startsWith("0x") && recipient.length === 42);
  const isValidAmount = parseFloat(amount) > 0;
  const canSubmit = walletAddress && isValidRecipient && isValidAmount && !loading;

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: walletAddress,
          fromEmail: userEmail,
          toIdentifier: recipient,
          amount,
          memo: memo || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create request");
      }

      setSuccess(`Request sent for $${amount} USDT0`);
      setRecipient("");
      setAmount("");
      setMemo("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="liquid-glass rounded-3xl p-6 md:p-8 space-y-5"
    >
      <h2 className="text-xl font-semibold text-white">Request Money</h2>

      <div>
        <label className="block text-white/50 text-sm mb-2 font-medium">
          From (email, phone, or address)
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="friend@email.com, +1234567890, or 0x..."
          className="input-glass w-full"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-white/50 text-sm mb-2 font-medium">
          Amount (USDT0)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            $
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="input-glass w-full pl-8"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-white/50 text-sm mb-2 font-medium">
          What for? (optional)
        </label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Dinner, rent, etc."
          className="input-glass w-full"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm">
          {success}
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
            <HandCoins className="w-5 h-5" />
            Request {amount ? `$${amount}` : "Money"}
          </>
        )}
      </button>

      <p className="text-white/30 text-xs text-center">
        They&apos;ll receive a notification to pay
      </p>
    </form>
  );
}

