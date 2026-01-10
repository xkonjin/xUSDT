"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Gift, Copy, Check, Users, DollarSign, Share2 } from "lucide-react";
import {
  initTelegramWebApp,
  hapticFeedback,
  showBackButton,
  hideBackButton,
  shareToChat,
  getTelegramUser,
} from "@/lib/telegram";
import Link from "next/link";

export default function InvitePage() {
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<{ id: number; first_name: string } | null>(null);

  // Generate referral code from user ID or random
  const referralCode = user ? `TG${user.id.toString(36).toUpperCase()}` : "PLASMA";
  const referralLink = `https://t.me/PlasmaPayBot?start=${referralCode}`;

  useEffect(() => {
    initTelegramWebApp();
    setUser(getTelegramUser());
    showBackButton(() => {
      window.location.href = "/";
    });

    return () => {
      hideBackButton();
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    hapticFeedback("light");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    hapticFeedback("medium");
    shareToChat(
      `Join me on Plasma Pay! Send money instantly with zero fees. Use my link and we both earn $0.10: ${referralLink}`
    );
  };

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
        <h1 className="text-xl font-bold text-white">Invite Friends</h1>
      </div>

      {/* Reward Card */}
      <div className="glass rounded-3xl p-6 mb-6 text-center bg-gradient-to-br from-purple-500/20 to-[rgb(0,212,255)]/20">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/30 to-[rgb(0,212,255)]/30 flex items-center justify-center">
          <Gift className="w-10 h-10 text-[rgb(0,212,255)]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Earn <span className="gradient-text">$0.10</span>
        </h2>
        <p className="text-white/50">for each friend who joins</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-2 text-purple-400" />
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-white/40">Friends Invited</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-2 text-green-400" />
          <p className="text-2xl font-bold text-white">$0.00</p>
          <p className="text-xs text-white/40">Total Earned</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="glass rounded-2xl p-4 mb-6">
        <p className="text-white/50 text-sm mb-2">Your referral link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-white text-sm truncate font-mono">
            {referralLink}
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

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Share2 className="w-5 h-5" />
        Share with Friends
      </button>

      {/* How it works */}
      <div className="mt-8 glass rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-4">How it works</h3>
        <ol className="space-y-3 text-sm text-white/60">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] flex items-center justify-center text-xs font-bold flex-shrink-0">
              1
            </span>
            Share your link in any Telegram chat
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] flex items-center justify-center text-xs font-bold flex-shrink-0">
              2
            </span>
            Friends open the bot and connect wallet
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] flex items-center justify-center text-xs font-bold flex-shrink-0">
              3
            </span>
            You both earn $0.10 on their first transaction
          </li>
        </ol>
      </div>
    </div>
  );
}
