"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, Users } from "lucide-react";
import type { PredictionMarket } from "@/lib/types";
import { formatUSDT, formatPrice, formatTimeLeft } from "@/lib/constants";
import { usePredictionStore } from "@/lib/store";

interface MarketCardProps {
  market: PredictionMarket;
  index?: number;
}

export function MarketCard({ market, index = 0 }: MarketCardProps) {
  const { openBettingModal } = usePredictionStore();
  const yesPercent = Math.round(market.yesPrice * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="prediction-card p-4 sm:p-5"
    >
      {/* Question */}
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 leading-snug">
        {market.question}
      </h3>

      {/* Price Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="text-yes font-medium">YES {formatPrice(market.yesPrice)}</span>
          <span className="text-no font-medium">NO {formatPrice(market.noPrice)}</span>
        </div>
        <div className="price-bar">
          <div
            className="price-bar-fill"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-4 text-sm text-white/60">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" />
          <span>{formatUSDT(market.totalVolume)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{formatTimeLeft(market.endDate)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => openBettingModal(market, "YES")}
          className="flex-1 btn-yes touch-target flex items-center justify-center gap-2"
        >
          <span>Bet YES</span>
          <span className="opacity-75">{formatPrice(market.yesPrice)}</span>
        </button>
        <button
          onClick={() => openBettingModal(market, "NO")}
          className="flex-1 btn-no touch-target flex items-center justify-center gap-2"
        >
          <span>Bet NO</span>
          <span className="opacity-75">{formatPrice(market.noPrice)}</span>
        </button>
      </div>
    </motion.div>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="prediction-card p-4 sm:p-5 animate-pulse">
      <div className="h-6 bg-white/10 rounded w-3/4 mb-3" />
      <div className="h-4 bg-white/10 rounded w-full mb-2" />
      <div className="h-2 bg-white/10 rounded w-full mb-4" />
      <div className="flex gap-4 mb-4">
        <div className="h-4 bg-white/10 rounded w-20" />
        <div className="h-4 bg-white/10 rounded w-20" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 h-11 bg-white/10 rounded-xl" />
        <div className="flex-1 h-11 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}
