"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, Copy, Check, Gift, DollarSign, 
  Share2
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

// Mock referral data
const mockReferrals = [
  { address: "0x1234...5678", earned: 45.50, volume: 4550, date: "2026-01-10" },
  { address: "0xabcd...efgh", earned: 23.20, volume: 2320, date: "2026-01-08" },
  { address: "0x9876...5432", earned: 12.80, volume: 1280, date: "2026-01-05" },
];

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  
  // Demo referral code
  const referralCode = "PLASMA_ABC123";
  const referralLink = `https://predictions.plasma.to?ref=${referralCode}`;
  
  // Mock stats
  const totalReferrals = mockReferrals.length;
  const totalEarned = mockReferrals.reduce((sum, r) => sum + r.earned, 0);
  const pendingPayout = 15.30;
  const minPayout = 10;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    const text = `Join me on Pledictions! Make predictions on real-world events and earn rewards. Use my referral link:`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pledictions",
          text,
          url: referralLink,
        });
      } catch (error) {
        console.warn("Share canceled or failed:", error);
      }
    } else {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
      window.open(twitterUrl, "_blank");
    }
  };

  const handleWithdraw = () => {
    if (pendingPayout >= minPayout) {
      toast.success("Withdrawal initiated!", {
        description: `$${pendingPayout.toFixed(2)} will be sent to your wallet`,
      });
    } else {
      toast.error(`Minimum payout is $${minPayout}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20 md:pb-8">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 pt-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Referral Program</h1>
          <p className="text-white/60">
            Earn 1% of your referrals&apos; trading fees forever
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5 text-cyan-400" />}
            label="Total Referrals"
            value={totalReferrals.toString()}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-green-400" />}
            label="Total Earned"
            value={`$${totalEarned.toFixed(2)}`}
          />
          <StatCard
            icon={<Gift className="w-5 h-5 text-purple-400" />}
            label="Pending Payout"
            value={`$${pendingPayout.toFixed(2)}`}
          />
        </div>

        {/* Referral Link Section */}
        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 mb-6">
          <h3 className="font-semibold text-white mb-4">Your Referral Link</h3>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 p-3 bg-white/5 rounded-xl overflow-hidden">
              <code className="text-sm text-cyan-400 font-mono truncate block">
                {referralLink}
              </code>
            </div>
            <button
              onClick={handleCopyLink}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-white/60" />
              )}
            </button>
            <button
              onClick={handleShare}
              className="p-3 bg-cyan-500 hover:bg-cyan-600 rounded-xl transition"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>Your code:</span>
            <code className="px-2 py-0.5 bg-white/10 rounded text-white/80">
              {referralCode}
            </code>
          </div>
        </div>

        {/* How It Works */}
        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 mb-6">
          <h3 className="font-semibold text-white mb-4">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-3">
                <Share2 className="w-5 h-5 text-cyan-400" />
              </div>
              <h4 className="font-medium text-white mb-1">Share Your Link</h4>
              <p className="text-sm text-white/40">
                Send your unique referral link to friends
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <h4 className="font-medium text-white mb-1">Friends Join & Trade</h4>
              <p className="text-sm text-white/40">
                They sign up and make predictions
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3">
                <Gift className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="font-medium text-white mb-1">Earn 1% Forever</h4>
              <p className="text-sm text-white/40">
                Get 1% of their trading fees for life
              </p>
            </div>
          </div>
        </div>

        {/* Payout Section */}
        <div className="p-5 bg-white/5 rounded-2xl border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Withdraw Earnings</h3>
            <button
              onClick={handleWithdraw}
              disabled={pendingPayout < minPayout}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-medium transition"
            >
              Withdraw ${pendingPayout.toFixed(2)}
            </button>
          </div>
          <p className="text-sm text-white/40">
            Minimum payout threshold: ${minPayout}. Withdrawals sent to your USDT₀ balance.
          </p>
        </div>

        {/* Referral History */}
        <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
          <h3 className="font-semibold text-white mb-4">Referral History</h3>
          
          {mockReferrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No referrals yet</p>
              <p className="text-sm text-white/30 mt-1">Share your link to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mockReferrals.map((referral, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-mono text-white">{referral.address}</p>
                      <p className="text-xs text-white/40">Joined {referral.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-400">+${referral.earned.toFixed(2)}</p>
                    <p className="text-xs text-white/40">${referral.volume} volume</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
