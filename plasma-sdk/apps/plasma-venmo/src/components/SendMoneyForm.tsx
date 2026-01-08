"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { PlasmaEmbeddedWallet } from "@plasma-pay/privy-auth";
import { sendMoney } from "@/lib/send";

interface SendMoneyFormProps {
  wallet: PlasmaEmbeddedWallet | null;
  onSuccess?: () => void;
}

export function SendMoneyForm({ wallet, onSuccess }: SendMoneyFormProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !recipient || !amount) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await sendMoney(wallet, {
        recipientIdentifier: recipient,
        amount,
      });

      if (result.success) {
        setSuccess(`Sent $${amount} successfully!`);
        setRecipient("");
        setAmount("");
        onSuccess?.();
      } else {
        setError(result.error || "Transaction failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const isValidRecipient =
    recipient.includes("@") || /^\+?\d{10,}$/.test(recipient);
  const isValidAmount = parseFloat(amount) > 0;
  const canSubmit = wallet && isValidRecipient && isValidAmount && !loading;

  return (
    <form
      onSubmit={handleSubmit}
      className="liquid-glass rounded-3xl p-6 md:p-8 space-y-5"
    >
      <h2 className="text-xl font-semibold text-white">Send Money</h2>

      <div>
        <label className="block text-white/50 text-sm mb-2 font-medium">
          To (email or phone)
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="friend@email.com or +1234567890"
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
          <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send {amount ? `$${amount}` : "Money"}
          </>
        )}
      </button>

      <p className="text-white/30 text-xs text-center">
        Zero gas fees on Plasma Chain
      </p>
    </form>
  );
}
