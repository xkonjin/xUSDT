"use client";

import { useEffect, useState } from "react";
import { Send, Receipt, Clock, Gift } from "lucide-react";
import {
  initTelegramWebApp,
  hapticFeedback,
  isTelegramWebApp,
} from "@/lib/telegram";
import { useTelegramAuth } from "@/lib/use-telegram-auth";

export default function TelegramHome() {
  const [isMounted, setIsMounted] = useState(false);
  const { user, startParam: referralCode } = useTelegramAuth();

  useEffect(() => {
    setIsMounted(true);
    initTelegramWebApp();
  }, []);

  if (!isMounted) {
    return <div className="min-h-screen bg-[#0a0a0f]" />;
  }

  const handleAction = (action: string) => {
    hapticFeedback("medium");
    // Navigate to action
    window.location.href = `/${action}`;
  };

  return (
    <div className="min-h-screen p-4 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="text-center mb-8 pt-4">
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Plasma</span> Pay
        </h1>
        {user && (
          <p className="text-white/50">
            Welcome, {user.first_name}!
          </p>
        )}
      </div>

      {/* Balance Card */}
      <div className="glass rounded-3xl p-6 mb-6">
        <p className="text-white/50 text-sm mb-1">Your Balance</p>
        <p className="text-4xl font-bold text-white">$0.00</p>
        <p className="text-white/40 text-sm mt-2">USDT0 on Plasma</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => handleAction("send")}
          className="glass rounded-2xl p-5 text-left active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-[rgb(0,212,255)]/20 flex items-center justify-center mb-3">
            <Send className="w-6 h-6 text-[rgb(0,212,255)]" />
          </div>
          <p className="font-semibold text-white">Send</p>
          <p className="text-white/40 text-sm">To anyone</p>
        </button>

        <button
          onClick={() => handleAction("request")}
          className="glass rounded-2xl p-5 text-left active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
            <Receipt className="w-6 h-6 text-purple-400" />
          </div>
          <p className="font-semibold text-white">Request</p>
          <p className="text-white/40 text-sm">Split bills</p>
        </button>

        <button
          onClick={() => handleAction("streams")}
          className="glass rounded-2xl p-5 text-left active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-green-400" />
          </div>
          <p className="font-semibold text-white">Streams</p>
          <p className="text-white/40 text-sm">Real-time pay</p>
        </button>

        <button
          onClick={() => handleAction("invite")}
          className="glass rounded-2xl p-5 text-left active:scale-95 transition-transform"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
            <Gift className="w-6 h-6 text-amber-400" />
          </div>
          <p className="font-semibold text-white">Invite</p>
          <p className="text-white/40 text-sm">Earn $0.10</p>
        </button>
      </div>

      {/* Referral Banner */}
      {referralCode && (
        <div className="glass rounded-2xl p-4 mb-6 border-[rgb(0,212,255)]/30 border">
          <p className="text-white/50 text-sm">Referred by</p>
          <p className="font-semibold text-[rgb(0,212,255)]">{referralCode}</p>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/30">No transactions yet</p>
          <p className="text-white/20 text-sm mt-1">Send money to get started</p>
        </div>
      </div>

      {/* Info */}
      <div className="text-center text-white/30 text-xs pb-20">
        <p>Zero fees • Instant transfers</p>
        <p className="mt-1">Powered by Plasma Network</p>
      </div>

      {/* Telegram indicator */}
      {!isTelegramWebApp() && (
        <div className="fixed bottom-4 left-4 right-4 bg-amber-500/20 text-amber-400 text-sm p-3 rounded-xl text-center">
          Open in Telegram for the full experience
        </div>
      )}
    </div>
  );
}
