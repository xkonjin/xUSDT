"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Send, User, DollarSign, Loader2, Check } from "lucide-react";
import {
  initTelegramWebApp,
  hapticFeedback,
  showMainButton,
  hideMainButton,
  showBackButton,
  hideBackButton,
} from "@/lib/telegram";
import Link from "next/link";

export default function SendPage() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initTelegramWebApp();
    showBackButton(() => {
      window.location.href = "/";
    });

    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, []);

  useEffect(() => {
    const canSend = recipient.length > 0 && parseFloat(amount) > 0;
    
    if (canSend && !loading && !success) {
      showMainButton("Send Money", handleSend);
    } else {
      hideMainButton();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient, amount, loading, success]);

  const handleSend = async () => {
    if (!recipient || !amount) return;

    setLoading(true);
    setError(null);
    hapticFeedback("medium");

    try {
      // In production, this would call the payment API
      // For demo, simulate a successful send
      await new Promise((resolve) => setTimeout(resolve, 1500));

      hapticFeedback("success");
      setSuccess(true);
      hideMainButton();
    } catch (err) {
      hapticFeedback("error");
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Sent!</h1>
        <p className="text-4xl font-bold gradient-text mb-2">${amount}</p>
        <p className="text-white/50 mb-8">to {recipient}</p>
        <Link
          href="/"
          className="btn-primary w-full max-w-xs"
          onClick={() => hapticFeedback("light")}
        >
          Done
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => hapticFeedback("light")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">Send Money</h1>
      </div>

      <div className="space-y-6">
        {/* Recipient Input */}
        <div>
          <label className="block text-white/50 text-sm mb-2">To</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="@username or phone"
              className="input-field pl-12"
              disabled={loading}
            />
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-white/50 text-sm mb-2">Amount</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="input-field pl-12 text-2xl font-semibold"
              disabled={loading}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
              USDT0
            </span>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2">
          {["5", "10", "25", "50"].map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setAmount(amt);
                hapticFeedback("light");
              }}
              className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                amount === amt
                  ? "bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] border border-[rgb(0,212,255)]/30"
                  : "glass text-white/60"
              }`}
              disabled={loading}
            >
              ${amt}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Info */}
        <div className="text-center text-white/30 text-xs mt-8">
          <p>Zero fees • Instant transfers</p>
        </div>

        {/* Manual send button for non-Telegram browsers */}
        <button
          onClick={handleSend}
          disabled={!recipient || !amount || loading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send ${amount || "0.00"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
