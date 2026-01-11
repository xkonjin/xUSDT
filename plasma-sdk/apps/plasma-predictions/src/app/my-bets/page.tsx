"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, Clock, ChevronRight, Sparkles, Filter } from "lucide-react";
import Link from "next/link";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BetCard } from "@/components/BetCard";
import { BettingModal } from "@/components/BettingModal";
import { useUserBets } from "@/hooks/useBets";
import { formatUSDT, formatVolume } from "@/lib/constants";

type BetFilter = "all" | "active" | "won" | "lost";

const FILTER_OPTIONS: { value: BetFilter; label: string }[] = [
  { value: "all", label: "All Bets" },
  { value: "active", label: "Active" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  trend 
}: { 
  icon: typeof TrendingUp; 
  label: string; 
  value: string; 
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-white/40" />
        <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span className={`text-sm font-medium ${trend.positive ? 'text-[rgb(var(--yes-green))]' : 'text-[rgb(var(--no-red))]'}`}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

function ConnectPrompt() {
  const { login } = usePlasmaWallet();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[rgba(var(--accent-cyan),0.15)] to-[rgba(var(--accent-violet),0.15)] flex items-center justify-center mb-6">
        <Wallet className="w-12 h-12 text-[rgb(var(--accent-cyan))]" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">
        Connect to View Your Bets
      </h2>
      <p className="text-white/50 mb-8 max-w-sm">
        Sign in to track your predictions, view your portfolio, and manage your positions.
      </p>
      <button onClick={login} className="btn-primary text-lg px-8 py-3.5 flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        <span>Connect Wallet</span>
      </button>
    </motion.div>
  );
}

function EmptyState({ filter }: { filter: BetFilter }) {
  const messages: Record<BetFilter, { title: string; description: string }> = {
    all: { title: "No bets yet", description: "Make your first prediction to get started" },
    active: { title: "No active bets", description: "Your open positions will appear here" },
    won: { title: "No wins yet", description: "Your winning bets will appear here" },
    lost: { title: "No losses", description: "Your losing bets will appear here" },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16"
    >
      <div className="text-6xl mb-4">🎯</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {messages[filter].title}
      </h3>
      <p className="text-white/50 mb-6">{messages[filter].description}</p>
      <Link href="/predictions" className="btn-primary inline-flex items-center gap-2">
        Browse Markets
        <ChevronRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}

export default function MyBetsPage() {
  const { authenticated, ready, wallet } = usePlasmaWallet();
  const [filter, setFilter] = useState<BetFilter>("all");
  
  const { data: bets, isLoading } = useUserBets(wallet?.address);

  // Mock stats - replace with real data
  const stats = {
    totalProfit: 1234.56,
    winRate: 0.67,
    activeBets: 3,
    totalVolume: 8900,
  };

  if (!ready) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-2 border-[rgb(var(--accent-cyan))] border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <ConnectPrompt />
        <BottomNav />
        <BettingModal />
      </div>
    );
  }

  const filteredBets = bets?.filter((bet) => {
    switch (filter) {
      case "active":
        return bet.status === "active";
      case "won":
        return bet.status === "won";
      case "lost":
        return bet.status === "lost";
      default:
        return true;
    }
  }) || [];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />

      <section className="px-4 pt-8 pb-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              My Bets
            </h1>
            <p className="text-white/50">Track your predictions and performance</p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
          >
            <StatsCard
              icon={TrendingUp}
              label="Total Profit"
              value={formatVolume(stats.totalProfit)}
              trend={{ value: "12%", positive: true }}
            />
            <StatsCard
              icon={Wallet}
              label="Win Rate"
              value={`${(stats.winRate * 100).toFixed(0)}%`}
            />
            <StatsCard
              icon={Clock}
              label="Active Bets"
              value={stats.activeBets.toString()}
            />
            <StatsCard
              icon={TrendingUp}
              label="Volume"
              value={formatVolume(stats.totalVolume)}
            />
          </motion.div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-white/40 flex-shrink-0" />
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`category-tab ${filter === opt.value ? "active" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Bets List */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="market-card p-4 animate-pulse">
                  <div className="h-5 bg-white/5 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-white/5 rounded w-1/2 mb-3" />
                  <div className="flex gap-3">
                    <div className="h-10 bg-white/5 rounded flex-1" />
                    <div className="h-10 bg-white/5 rounded flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBets.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div className="space-y-4">
              {filteredBets.map((bet, i) => (
                <BetCard key={bet.id} bet={bet} index={i} />
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
