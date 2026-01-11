"use client";

import { useState, useEffect } from "react";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { share } from "@plasma-pay/share";
import {
  Gift,
  Copy,
  Check,
  Users,
  DollarSign,
  Share2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface ReferralStats {
  totalReferred: number;
  pendingRewards: number;
  paidRewards: number;
  totalEarned: number;
}

interface UserSettings {
  referralCode: string;
  displayName?: string;
}

export default function InvitePage() {
  const { wallet, authenticated, ready } = usePlasmaWallet();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet?.address) return;

    async function fetchData() {
      try {
        const [settingsRes, referralsRes] = await Promise.all([
          fetch(`/api/user-settings?address=${wallet?.address}`),
          fetch(`/api/referrals?address=${wallet?.address}`),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data.settings);
        }

        if (referralsRes.ok) {
          const data = await referralsRes.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [wallet?.address]);

  const referralLink = settings?.referralCode
    ? `https://plasma.to/r/${settings.referralCode}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async (channel: "whatsapp" | "telegram" | "sms" | "twitter") => {
    await share({
      channel,
      title: "Join Plasma Pay",
      text: "Send money instantly with zero fees! Use my referral link and we both earn $0.10:",
      url: referralLink,
    });
  };

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[rgb(0,212,255)] animate-spin" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8">
        <p className="text-white/50">Please connect your wallet first</p>
        <Link href="/" className="text-[rgb(0,212,255)] mt-4 hover:underline">
          Go to Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] blur-3xl" />
      </div>

      <header className="flex items-center gap-4 mb-8 relative z-10">
        <Link
          href="/"
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Invite Friends</h1>
      </header>

      <div className="max-w-lg mx-auto space-y-6 relative z-10">
        {/* Reward Banner */}
        <div className="liquid-glass-elevated rounded-3xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-[rgb(0,212,255)]/20 flex items-center justify-center">
            <Gift className="w-10 h-10 text-[rgb(0,212,255)]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Earn <span className="gradient-text">$0.10</span> per friend
          </h2>
          <p className="text-white/50">
            Share your link and earn when friends make their first transaction
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="liquid-glass-subtle rounded-2xl p-4 text-center animate-pulse">
                <div className="w-5 h-5 mx-auto mb-2 bg-white/10 rounded" />
                <div className="h-7 bg-white/10 rounded mx-auto w-12 mb-1" />
                <div className="h-3 bg-white/10 rounded mx-auto w-10" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="liquid-glass-subtle rounded-2xl p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold text-white">{stats.totalReferred}</p>
              <p className="text-xs text-white/40">Invited</p>
            </div>
            <div className="liquid-glass-subtle rounded-2xl p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-white">
                ${stats.totalEarned.toFixed(2)}
              </p>
              <p className="text-xs text-white/40">Earned</p>
            </div>
            <div className="liquid-glass-subtle rounded-2xl p-4 text-center">
              <Gift className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold text-white">{stats.pendingRewards}</p>
              <p className="text-xs text-white/40">Pending</p>
            </div>
          </div>
        ) : null}

        {/* Referral Link */}
        {loading ? (
          <div className="liquid-glass rounded-2xl p-6 animate-pulse">
            <div className="h-12 bg-white/10 rounded-xl" />
          </div>
        ) : (
          <div className="liquid-glass rounded-2xl p-6">
            <label className="text-sm text-white/50 mb-2 block">Your referral link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-white font-mono text-sm truncate">
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
        )}

        {/* Share Buttons */}
        <div className="space-y-3">
          <p className="text-sm text-white/50">Share via</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleShare("whatsapp")}
              className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] transition-colors"
            >
              <Share2 className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={() => handleShare("telegram")}
              className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-[#0088cc] transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Telegram
            </button>
            <button
              onClick={() => handleShare("sms")}
              className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Share2 className="w-5 h-5" />
              SMS
            </button>
            <button
              onClick={() => handleShare("twitter")}
              className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Twitter
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="liquid-glass-subtle rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">How it works</h3>
          <ol className="space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </span>
              Share your unique referral link with friends
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </span>
              They sign up and connect their wallet
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </span>
              When they make their first transaction, you both earn $0.10
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
