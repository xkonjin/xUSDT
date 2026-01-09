"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import type { Bet } from "@/lib/types";
import { formatUSDT, formatTimeLeft, formatPercent } from "@/lib/constants";
import { usePredictionStore } from "@/lib/store";

interface BetCardProps {
  bet: Bet;
  index?: number;
}

function BetCardComponent({ bet, index = 0 }: BetCardProps) {
  const { openCashOutModal } = usePredictionStore();
  
  // Memoize computed values to prevent recalculations on re-renders
  const { isYes, isProfitable } = useMemo(() => ({
    isYes: bet.outcome === "YES",
    isProfitable: bet.pnl > 0,
  }), [bet.outcome, bet.pnl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="prediction-card p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className={`badge-${isYes ? "yes" : "no"}`}>
          {bet.outcome}
        </div>
        {bet.status === "active" && (
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            <Clock className="w-3.5 h-3.5" />
            {formatTimeLeft(bet.market.endDate)}
          </div>
        )}
        {bet.status === "won" && (
          <span className="badge-yes">Won</span>
        )}
        {bet.status === "lost" && (
          <span className="badge-no">Lost</span>
        )}
        {bet.status === "cashed_out" && (
          <span className="badge-pending">Cashed Out</span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-sm font-medium text-white mb-3 leading-snug">
        {bet.market.question}
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card">
          <p className="text-white/50 text-xs mb-1">Cost Basis</p>
          <p className="text-white font-medium">
            {formatUSDT(bet.costBasis)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-white/50 text-xs mb-1">Current Value</p>
          <div className="flex items-center gap-2">
            <p className="text-white font-medium">
              {formatUSDT(bet.currentValue)}
            </p>
            <div
              className={`flex items-center gap-0.5 text-xs font-medium
                ${isProfitable ? "text-yes" : "text-no"}`}
            >
              {isProfitable ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {formatPercent(Math.abs(bet.pnlPercent))}
            </div>
          </div>
        </div>
      </div>

      {/* Shares Info */}
      <div className="flex items-center justify-between text-sm text-white/60 mb-4">
        <span>{bet.shares.toFixed(2)} shares</span>
        <span>
          P&L: {isProfitable ? "+" : ""}{formatUSDT(bet.pnl)}
        </span>
      </div>

      {/* Cash Out Button */}
      {bet.status === "active" && (
        <button
          onClick={() => openCashOutModal(bet)}
          className={`w-full touch-target rounded-xl font-medium
            ${isProfitable
              ? "btn-yes"
              : "bg-white/10 text-white hover:bg-white/15"
            }`}
        >
          Cash Out {formatUSDT(bet.currentValue)}
        </button>
      )}
    </motion.div>
  );
}

export const BetCard = memo(BetCardComponent);
BetCard.displayName = "BetCard";

export function BetCardSkeleton() {
  return (
    <div className="prediction-card p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-5 w-12 bg-white/10 rounded-full" />
        <div className="h-4 w-16 bg-white/10 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-white/10 rounded mb-3" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-16 bg-white/10 rounded-xl" />
        <div className="h-16 bg-white/10 rounded-xl" />
      </div>
      <div className="h-11 bg-white/10 rounded-xl" />
    </div>
  );
}
