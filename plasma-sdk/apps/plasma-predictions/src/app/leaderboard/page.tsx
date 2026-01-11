"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Target, Flame, Medal } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BettingModal } from "@/components/BettingModal";
import { formatAddress, formatVolume } from "@/lib/constants";

type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all-time";
type LeaderboardSort = "profit" | "winRate" | "volume";

const MOCK_LEADERS = [
  { rank: 1, address: "0x1234567890abcdef1234567890abcdef12345678", profit: 125420, winRate: 0.78, totalBets: 156, volume: 450000 },
  { rank: 2, address: "0xabcdef1234567890abcdef1234567890abcdef12", profit: 98340, winRate: 0.72, totalBets: 203, volume: 380000 },
  { rank: 3, address: "0x9876543210fedcba9876543210fedcba98765432", profit: 76890, winRate: 0.68, totalBets: 89, volume: 290000 },
  { rank: 4, address: "0xfedcba9876543210fedcba9876543210fedcba98", profit: 54320, winRate: 0.65, totalBets: 167, volume: 245000 },
  { rank: 5, address: "0x1111222233334444555566667777888899990000", profit: 43210, winRate: 0.71, totalBets: 78, volume: 198000 },
  { rank: 6, address: "0xaaaa111122223333444455556666777788889999", profit: 38900, winRate: 0.63, totalBets: 234, volume: 176000 },
  { rank: 7, address: "0xbbbb222233334444555566667777888899990000", profit: 32100, winRate: 0.59, totalBets: 145, volume: 154000 },
  { rank: 8, address: "0xcccc333344445555666677778888999900001111", profit: 28700, winRate: 0.66, totalBets: 92, volume: 132000 },
  { rank: 9, address: "0xdddd444455556666777788889999000011112222", profit: 24300, winRate: 0.61, totalBets: 178, volume: 118000 },
  { rank: 10, address: "0xeeee555566667777888899990000111122223333", profit: 21500, winRate: 0.58, totalBets: 201, volume: 105000 },
];

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "all-time", label: "All Time" },
];

const SORT_OPTIONS: { value: LeaderboardSort; label: string; icon: typeof Trophy }[] = [
  { value: "profit", label: "Profit", icon: TrendingUp },
  { value: "winRate", label: "Win Rate", icon: Target },
  { value: "volume", label: "Volume", icon: Flame },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="rank-badge rank-1">
        <Trophy className="w-4 h-4" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="rank-badge rank-2">
        <Medal className="w-4 h-4" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="rank-badge rank-3">
        <Medal className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="rank-badge rank-other">
      {rank}
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [sortBy, setSortBy] = useState<LeaderboardSort>("profit");

  const sortedLeaders = [...MOCK_LEADERS].sort((a, b) => {
    switch (sortBy) {
      case "winRate":
        return b.winRate - a.winRate;
      case "volume":
        return b.volume - a.volume;
      default:
        return b.profit - a.profit;
    }
  });

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />

      <section className="px-4 pt-8 pb-6">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[rgba(255,215,100,0.2)] to-[rgba(255,180,50,0.1)] mx-auto mb-6 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-[rgb(255,215,100)]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Leaderboard
            </h1>
            <p className="text-white/50 text-lg">
              Top predictors ranked by performance
            </p>
          </motion.div>

          {/* Period Tabs */}
          <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`category-tab ${period === opt.value ? "active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort Options */}
          <div className="flex justify-center gap-2 mb-8">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  sortBy === opt.value
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-white/50 border border-transparent hover:text-white/80"
                }`}
              >
                <opt.icon className="w-4 h-4" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Top 3 Podium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 mb-8"
          >
            {/* 2nd Place */}
            <div className="market-card p-4 text-center order-1 md:order-1 self-end">
              <div className="rank-badge rank-2 mx-auto mb-3">
                <Medal className="w-4 h-4" />
              </div>
              <p className="text-sm font-mono text-white/60 mb-1">
                {formatAddress(sortedLeaders[1].address, 3)}
              </p>
              <p className="text-lg font-bold text-white">
                {formatVolume(sortedLeaders[1].profit)}
              </p>
              <p className="text-xs text-white/40">
                {(sortedLeaders[1].winRate * 100).toFixed(0)}% win rate
              </p>
            </div>

            {/* 1st Place */}
            <div className="market-card-featured p-5 text-center order-0 md:order-2 scale-105 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="text-2xl">👑</span>
              </div>
              <div className="rank-badge rank-1 mx-auto mb-3 mt-2">
                <Trophy className="w-4 h-4" />
              </div>
              <p className="text-sm font-mono text-white/60 mb-1">
                {formatAddress(sortedLeaders[0].address, 3)}
              </p>
              <p className="text-2xl font-bold text-gradient-gold">
                {formatVolume(sortedLeaders[0].profit)}
              </p>
              <p className="text-xs text-white/40">
                {(sortedLeaders[0].winRate * 100).toFixed(0)}% win rate
              </p>
            </div>

            {/* 3rd Place */}
            <div className="market-card p-4 text-center order-2 md:order-3 self-end">
              <div className="rank-badge rank-3 mx-auto mb-3">
                <Medal className="w-4 h-4" />
              </div>
              <p className="text-sm font-mono text-white/60 mb-1">
                {formatAddress(sortedLeaders[2].address, 3)}
              </p>
              <p className="text-lg font-bold text-white">
                {formatVolume(sortedLeaders[2].profit)}
              </p>
              <p className="text-xs text-white/40">
                {(sortedLeaders[2].winRate * 100).toFixed(0)}% win rate
              </p>
            </div>
          </motion.div>

          {/* Rest of Leaderboard */}
          <div className="space-y-3">
            {sortedLeaders.slice(3).map((leader, i) => (
              <motion.div
                key={leader.address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                className="leaderboard-row flex items-center gap-4"
              >
                <RankBadge rank={leader.rank} />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-white truncate">
                    {formatAddress(leader.address, 6)}
                  </p>
                  <p className="text-xs text-white/40">
                    {leader.totalBets} bets • {formatVolume(leader.volume)} volume
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-[rgb(var(--yes-green))]">
                    +{formatVolume(leader.profit)}
                  </p>
                  <p className="text-xs text-white/40">
                    {(leader.winRate * 100).toFixed(0)}% win rate
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <BottomNav />
      <BettingModal />
    </div>
  );
}
