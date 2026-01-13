"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Receipt, DollarSign, Loader2, Check, Share2, Copy } from "lucide-react";
import {
  initTelegramWebApp,
  hapticFeedback,
  showMainButton,
  hideMainButton,
  showBackButton,
  hideBackButton,
  shareToChat,
} from "@/lib/telegram";
import Link from "next/link";

export default function RequestPage() {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestLink, setRequestLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
    const canRequest = parseFloat(amount) > 0;

    if (canRequest && !loading && !requestLink) {
      showMainButton("Create Request", handleCreate);
    } else {
      hideMainButton();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, loading, requestLink]);

  const handleCreate = async () => {
    if (!amount) return;

    setLoading(true);
    hapticFeedback("medium");

    try {
      // In production, this would call the API to create a request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate mock link
      const link = `https://plasma.to/pay/req_${Date.now().toString(36)}`;
      setRequestLink(link);
      hapticFeedback("success");
      hideMainButton();
    } catch {
      hapticFeedback("error");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!requestLink) return;
    hapticFeedback("light");
    shareToChat(`Pay me $${amount} on Plasma Pay: ${requestLink}`);
  };

  const handleCopy = async () => {
    if (!requestLink) return;
    await navigator.clipboard.writeText(requestLink);
    setCopied(true);
    hapticFeedback("light");
    setTimeout(() => setCopied(false), 2000);
  };

  if (requestLink) {
    return (
      <div className="min-h-screen p-4 safe-area-top safe-area-bottom">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => hapticFeedback("light")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Request Created</h1>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-purple-400" />
          </div>
          <p className="text-4xl font-bold gradient-text">${amount}</p>
          {memo && <p className="text-white/50 mt-2">{memo}</p>}
        </div>

        <div className="glass rounded-2xl p-4 mb-6">
          <p className="text-white/50 text-sm mb-2">Share this link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-white text-sm truncate font-mono">
              {requestLink}
            </div>
            <button
              onClick={handleCopy}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share to Chat
          </button>

          <Link
            href="/"
            className="block w-full py-3 text-center rounded-xl bg-white/10 text-white font-medium"
            onClick={() => hapticFeedback("light")}
          >
            Done
          </Link>
        </div>
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
        <h1 className="text-xl font-bold text-white">Request Money</h1>
      </div>

      <div className="space-y-6">
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

        {/* Memo Input */}
        <div>
          <label className="block text-white/50 text-sm mb-2">
            What&apos;s it for? (optional)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Dinner, rent, etc."
            className="input-field"
            disabled={loading}
          />
        </div>

        {/* Quick amounts */}
        <div className="grid grid-cols-4 gap-2">
          {["10", "25", "50", "100"].map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setAmount(amt);
                hapticFeedback("light");
              }}
              className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                amount === amt
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "glass text-white/60"
              }`}
              disabled={loading}
            >
              ${amt}
            </button>
          ))}
        </div>

        {/* Manual button */}
        <button
          onClick={handleCreate}
          disabled={!amount || loading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 bg-gradient-to-r from-purple-500 to-[rgb(0,212,255)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Receipt className="w-5 h-5" />
              Create Request
            </>
          )}
        </button>
      </div>
    </div>
  );
}
