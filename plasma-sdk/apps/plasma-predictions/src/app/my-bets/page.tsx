"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BetCard, BetCardSkeleton } from "@/components/BetCard";
import { BettingModal } from "@/components/BettingModal";
import { useUserBets, usePortfolioStats } from "@/hooks/useBets";
import { formatUSDT, formatPercent } from "@/lib/constants";

type FilterTab = "active" | "resolved" | "all";

export default function MyBetsPage() {
  const { authenticated, login, ready } = usePlasmaWallet();
  const { data: bets, isLoading } = useUserBets();
  const stats = usePortfolioStats();
  const [activeTab, setActiveTab] = useState<FilterTab>("active");

  const filteredBets = useMemo(() => {
    if (!bets) return [];
    switch (activeTab) {
      case "active":
        return bets.filter((b) => b.status === "active");
      case "resolved":
        return bets.filter((b) =>
          ["won", "lost", "cashed_out"].includes(b.status)
        );
      default:
        return bets;
    }
  }, [bets, activeTab]);

  if (!ready) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-white/10 rounded-2xl" />
            <div className="h-12 bg-white/10 rounded-xl" />
            <div className="h-48 bg-white/10 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="liquid-glass rounded-2xl p-8">
            <Wallet className="w-12 h-12 text-prediction-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Connect to View Your Bets
            </h2>
            <p className="text-white/60 text-sm mb-6">
              Sign in to track your predictions and portfolio performance.
            </p>
            <button onClick={login} className="btn-primary w-full">
              Get Started
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Portfolio Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass rounded-2xl p-6 mb-6"
        >
          <p className="text-white/50 text-sm mb-1">Portfolio Value</p>
          <div className="flex items-end gap-4 mb-4">
            <h1 className="text-4xl font-bold text-white">
              {formatUSDT(stats.totalValue)}
            </h1>
            {stats.totalPnl !== 0 && (
              <div
                className={`flex items-center gap-1 text-sm font-medium pb-1
                  ${stats.totalPnl > 0 ? "text-yes" : "text-no"}`}
              >
                {stats.totalPnl > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {stats.totalPnl > 0 ? "+" : ""}
                {formatUSDT(stats.totalPnl)} (
                {formatPercent(Math.abs(stats.totalPnlPercent))})
              </div>
            )}
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-white/50">Active</span>
              <span className="text-white ml-2 font-medium">
                {stats.activeBets}
              </span>
            </div>
            <div>
              <span className="text-white/50">Resolved</span>
              <span className="text-white ml-2 font-medium">
                {stats.resolvedBets}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(["active", "resolved", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition
                ${activeTab === tab
                  ? "bg-prediction-primary text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "active" && stats.activeBets > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {stats.activeBets}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bets List */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <BetCardSkeleton key={i} />)
          ) : filteredBets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/50 text-lg mb-2">
                {activeTab === "active"
                  ? "No active bets"
                  : activeTab === "resolved"
                  ? "No resolved bets"
                  : "No bets yet"}
              </p>
              <p className="text-white/30 text-sm">
                {activeTab === "active"
                  ? "Place your first prediction!"
                  : "Your betting history will appear here"}
              </p>
            </div>
          ) : (
            filteredBets.map((bet, i) => (
              <BetCard key={bet.id} bet={bet} index={i} />
            ))
          )}
        </div>
      </main>

      <BottomNav />
      <BettingModal />
    </div>
  );
}
