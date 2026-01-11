"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, Target, Flame, Medal, Loader2, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BettingModal } from "@/components/BettingModal";
import { formatAddress, formatVolume } from "@/lib/constants";
import { useLeaderboard, type LeaderboardSort } from "@/hooks";
import type { LeaderboardTimeFilter } from "@/lib/leaderboard-store";

type LeaderboardPeriod = "day" | "week" | "month" | "all";

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
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
  const {
    leaders,
    isLoading,
    error,
    sortBy,
    period,
    setSortBy,
    setPeriod,
  } = useLeaderboard({ sortBy: "profit", period: "all" });

  // Transform period for UI display
  const handlePeriodChange = (newPeriod: LeaderboardPeriod) => {
    setPeriod(newPeriod as LeaderboardTimeFilter);
  };

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

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-white/40 animate-spin mb-4" />
              <p className="text-white/50">Loading leaderboard...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <p className="text-red-400 mb-2">Failed to load leaderboard</p>
              <p className="text-white/40 text-sm">{error.message}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && leaders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/60 text-lg mb-2">No rankings yet</p>
              <p className="text-white/40 text-sm text-center max-w-xs">
                Be the first to make predictions and climb the leaderboard!
              </p>
            </div>
          )}

          {/* Top 3 Podium - only show when we have at least 3 users */}
          {!isLoading && !error && leaders.length >= 3 && (
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
                  {formatAddress(leaders[1].address, 3)}
                </p>
                <p className="text-lg font-bold text-white">
                  {formatVolume(leaders[1].totalProfit)}
                </p>
                <p className="text-xs text-white/40">
                  {(leaders[1].winRate * 100).toFixed(0)}% win rate
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
                  {formatAddress(leaders[0].address, 3)}
                </p>
                <p className="text-2xl font-bold text-gradient-gold">
                  {formatVolume(leaders[0].totalProfit)}
                </p>
                <p className="text-xs text-white/40">
                  {(leaders[0].winRate * 100).toFixed(0)}% win rate
                </p>
              </div>

              {/* 3rd Place */}
              <div className="market-card p-4 text-center order-2 md:order-3 self-end">
                <div className="rank-badge rank-3 mx-auto mb-3">
                  <Medal className="w-4 h-4" />
                </div>
                <p className="text-sm font-mono text-white/60 mb-1">
                  {formatAddress(leaders[2].address, 3)}
                </p>
                <p className="text-lg font-bold text-white">
                  {formatVolume(leaders[2].totalProfit)}
                </p>
                <p className="text-xs text-white/40">
                  {(leaders[2].winRate * 100).toFixed(0)}% win rate
                </p>
              </div>
            </motion.div>
          )}

          {/* For 1-2 leaders, show simple list */}
          {!isLoading && !error && leaders.length > 0 && leaders.length < 3 && (
            <div className="space-y-3 mb-8">
              {leaders.map((leader, i) => (
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
                      {leader.totalBets} bets • {formatVolume(leader.totalVolume)} volume
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-lg font-bold ${leader.totalProfit >= 0 ? "text-[rgb(var(--yes-green))]" : "text-[rgb(var(--no-red))]"}`}>
                      {leader.totalProfit >= 0 ? "+" : ""}{formatVolume(leader.totalProfit)}
                    </p>
                    <p className="text-xs text-white/40">
                      {(leader.winRate * 100).toFixed(0)}% win rate
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Rest of Leaderboard (4th place and below) */}
          {!isLoading && !error && leaders.length > 3 && (
            <div className="space-y-3">
              {leaders.slice(3).map((leader, i) => (
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
                      {leader.totalBets} bets • {formatVolume(leader.totalVolume)} volume
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-lg font-bold ${leader.totalProfit >= 0 ? "text-[rgb(var(--yes-green))]" : "text-[rgb(var(--no-red))]"}`}>
                      {leader.totalProfit >= 0 ? "+" : ""}{formatVolume(leader.totalProfit)}
                    </p>
                    <p className="text-xs text-white/40">
                      {(leader.winRate * 100).toFixed(0)}% win rate
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <BottomNav />
      <BettingModal />
    </div>
  );
}
