"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import type { UserBet } from "@/lib/types";
import { formatUSDT, formatTimeLeft, formatVolume } from "@/lib/constants";

interface BetCardProps {
  bet: UserBet;
  index?: number;
}

export function BetCard({ bet, index = 0 }: BetCardProps) {
  const isActive = bet.status === "active";
  const isWon = bet.status === "won";
  const isLost = bet.status === "lost";
  const isYes = bet.outcome === "YES";

  const currentValue = isActive 
    ? bet.shares * (isYes ? bet.market?.yesPrice || 0.5 : bet.market?.noPrice || 0.5)
    : isWon 
      ? bet.shares 
      : 0;
  
  const profitLoss = currentValue - bet.amount;
  const profitPercent = bet.amount > 0 ? (profitLoss / bet.amount) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`market-card p-5 ${isWon ? 'border-[rgba(var(--yes-green),0.3)]' : ''} ${isLost ? 'border-[rgba(var(--no-red),0.3)]' : ''}`}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`${isYes ? 'badge-yes' : 'badge-no'}`}>
            {bet.outcome}
          </span>
          {isActive && <span className="badge-live">Active</span>}
          {isWon && (
            <span className="text-xs font-semibold text-[rgb(var(--yes-green))] flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Won
            </span>
          )}
          {isLost && (
            <span className="text-xs font-semibold text-[rgb(var(--no-red))] flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              Lost
            </span>
          )}
        </div>
        
        {/* Link to Market */}
        <Link
          href={`/predictions/${bet.marketId}`}
          className="p-2 rounded-lg hover:bg-white/5 transition text-white/30 hover:text-white/60"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Question */}
      <Link href={`/predictions/${bet.marketId}`}>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4 leading-snug hover:text-white/90 transition line-clamp-2">
          {bet.market?.question || "Market"}
        </h3>
      </Link>

      {/* Position Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="stat-card py-3">
          <span className="text-xs text-white/40 block mb-1">Your Position</span>
          <span className="text-lg font-bold text-white">
            {bet.shares.toFixed(2)} shares
          </span>
        </div>
        <div className="stat-card py-3">
          <span className="text-xs text-white/40 block mb-1">Cost Basis</span>
          <span className="text-lg font-bold text-white">
            ${bet.amount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Value & P/L */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
        <div>
          <span className="text-xs text-white/40 block mb-1">
            {isActive ? "Current Value" : "Final Value"}
          </span>
          <span className="text-xl font-bold text-white">
            ${currentValue.toFixed(2)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-white/40 block mb-1">P&L</span>
          <span className={`text-xl font-bold ${
            profitLoss >= 0 
              ? 'text-[rgb(var(--yes-green))]' 
              : 'text-[rgb(var(--no-red))]'
          }`}>
            {profitLoss >= 0 ? '+' : ''}{formatVolume(profitLoss)}
            <span className="text-sm ml-1 opacity-70">
              ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(0)}%)
            </span>
          </span>
        </div>
      </div>

      {/* Meta Row */}
      <div className="flex items-center justify-between mt-4 text-xs text-white/40">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {isActive 
              ? formatTimeLeft(bet.market?.endDate || new Date().toISOString())
              : new Date(bet.settledAt || bet.createdAt).toLocaleDateString()
            }
          </span>
        </div>
        <span>
          Avg price: {((bet.amount / bet.shares) * 100).toFixed(0)}¢
        </span>
      </div>
    </motion.div>
  );
}
