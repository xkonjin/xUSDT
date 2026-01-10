"use client";

import { useState } from "react";
import { Gift, ChevronRight, Copy, Check, Users, DollarSign } from "lucide-react";

export interface InviteFriendsCardProps {
  referralCode: string;
  referralUrl: string;
  rewardAmount?: number;
  totalReferred?: number;
  totalEarned?: number;
  onShare?: () => void;
  onCopy?: () => void;
}

export function InviteFriendsCard({
  referralCode,
  referralUrl,
  rewardAmount = 0.10,
  totalReferred = 0,
  totalEarned = 0,
  onShare,
  onCopy,
}: InviteFriendsCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/20 via-[rgb(0,212,255)]/10 to-purple-500/20 rounded-3xl p-5 border border-white/10">
      {/* Main CTA */}
      <button
        onClick={onShare}
        className="w-full flex items-center gap-4 text-left"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[rgb(0,212,255)]/30 to-purple-500/30 flex items-center justify-center shrink-0">
          <Gift className="w-7 h-7 text-[rgb(0,212,255)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-lg">Invite Friends</h3>
          <p className="text-white/50 text-sm">
            Earn ${rewardAmount.toFixed(2)} for each friend who joins
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-white/40 shrink-0" />
      </button>

      {/* Stats (if user has referred anyone) */}
      {totalReferred > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-bold">{totalReferred}</p>
              <p className="text-white/40 text-xs">Friends invited</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 font-bold">${totalEarned.toFixed(2)}</p>
              <p className="text-white/40 text-xs">Total earned</p>
            </div>
          </div>
        </div>
      )}

      {/* Referral code */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-white/40 text-xs mb-2">Your referral code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 font-mono text-white/80 text-sm truncate">
            {referralCode}
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-sm font-medium">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact version for embedding in other screens
export function InviteFriendsBanner({
  onPress,
  rewardAmount = 0.10,
}: {
  onPress?: () => void;
  rewardAmount?: number;
}) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500/20 to-[rgb(0,212,255)]/20 rounded-2xl border border-white/10 hover:border-white/20 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-[rgb(0,212,255)]/20 flex items-center justify-center">
        <Gift className="w-5 h-5 text-[rgb(0,212,255)]" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-white font-semibold text-sm">
          Invite friends, earn ${rewardAmount.toFixed(2)}
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-white/40" />
    </button>
  );
}
