"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Target, BarChart2 } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { formatUSDT, formatAddress, formatPercent } from "@/lib/constants";
import type { LeaderboardEntry } from "@/lib/types";

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    address: "0x1234567890abcdef1234567890abcdef12345678",
    displayName: "PredictionKing",
    profit: 125000_000000,
    accuracy: 0.72,
    totalBets: 156,
    volume: 850000_000000,
  },
  {
    rank: 2,
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    displayName: "CryptoOracle",
    profit: 89000_000000,
    accuracy: 0.68,
    totalBets: 98,
    volume: 520000_000000,
  },
  {
    rank: 3,
    address: "0x9876543210fedcba9876543210fedcba98765432",
    profit: 67500_000000,
    accuracy: 0.65,
    totalBets: 234,
    volume: 1200000_000000,
  },
  {
    rank: 4,
    address: "0xfedcba9876543210fedcba9876543210fedcba98",
    displayName: "MarketMaven",
    profit: 45200_000000,
    accuracy: 0.61,
    totalBets: 87,
    volume: 380000_000000,
  },
  {
    rank: 5,
    address: "0x2468ace02468ace02468ace02468ace02468ace0",
    profit: 32100_000000,
    accuracy: 0.58,
    totalBets: 145,
    volume: 620000_000000,
  },
];

type SortBy = "profit" | "accuracy" | "volume";
type Period = "weekly" | "monthly" | "all-time";

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState<SortBy>("profit");
  const [period, setPeriod] = useState<Period>("weekly");

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-white/60">Top predictors on Plasma</p>
        </motion.div>

        {/* Period Tabs */}
        <div className="flex justify-center gap-2 mb-6">
          {(["weekly", "monthly", "all-time"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${period === p
                  ? "bg-prediction-primary text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
            >
              {p === "all-time"
                ? "All Time"
                : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSortBy("profit")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
              ${sortBy === "profit"
                ? "bg-yes/20 text-yes"
                : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            Profit
          </button>
          <button
            onClick={() => setSortBy("accuracy")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
              ${sortBy === "accuracy"
                ? "bg-prediction-primary/20 text-prediction-primary"
                : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
          >
            <Target className="w-4 h-4" />
            Accuracy
          </button>
          <button
            onClick={() => setSortBy("volume")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
              ${sortBy === "volume"
                ? "bg-plasma-500/20 text-plasma-400"
                : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
          >
            <BarChart2 className="w-4 h-4" />
            Volume
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3">
          {MOCK_LEADERBOARD.map((entry, i) => (
            <motion.div
              key={entry.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`prediction-card p-4 ${
                entry.rank <= 3 ? "border-yellow-500/30" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-12 text-center">
                  <span className="text-2xl">{getRankBadge(entry.rank)}</span>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {entry.displayName || formatAddress(entry.address)}
                  </p>
                  <p className="text-white/40 text-sm">
                    {entry.totalBets} bets
                  </p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  {sortBy === "profit" && (
                    <>
                      <p className="text-yes font-semibold">
                        +{formatUSDT(entry.profit)}
                      </p>
                      <p className="text-white/40 text-sm">
                        {formatPercent(entry.accuracy)} accuracy
                      </p>
                    </>
                  )}
                  {sortBy === "accuracy" && (
                    <>
                      <p className="text-prediction-primary font-semibold">
                        {formatPercent(entry.accuracy)}
                      </p>
                      <p className="text-white/40 text-sm">
                        {entry.totalBets} bets
                      </p>
                    </>
                  )}
                  {sortBy === "volume" && (
                    <>
                      <p className="text-plasma-400 font-semibold">
                        {formatUSDT(entry.volume)}
                      </p>
                      <p className="text-white/40 text-sm">
                        +{formatUSDT(entry.profit)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-sm">
            Rankings update every hour. Min 10 bets to qualify.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
