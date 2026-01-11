"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, Droplets, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { PredictionMarket } from "@/lib/types";
import { formatUSDT, formatPrice, formatTimeLeft, formatVolume } from "@/lib/constants";
import { usePredictionStore } from "@/lib/store";

interface MarketCardProps {
  market: PredictionMarket;
  index?: number;
  featured?: boolean;
}

export function MarketCard({ market, index = 0, featured = false }: MarketCardProps) {
  const { openBettingModal } = usePredictionStore();
  const yesPercent = Math.round(market.yesPrice * 100);
  const isEnded = new Date(market.endDate) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`${featured ? 'market-card-featured' : 'market-card'} p-5 sm:p-6`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        {/* Category Badge */}
        <div className="flex items-center gap-2">
          {market.imageUrl && (
            <img 
              src={market.imageUrl} 
              alt="" 
              className="w-10 h-10 rounded-xl object-cover border border-white/10"
            />
          )}
          <div>
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
              {market.category !== 'all' ? market.category : 'Market'}
            </span>
            {!isEnded && (
              <span className="badge-live ml-2">Live</span>
            )}
          </div>
        </div>
        
        {/* Polymarket Link */}
        {market.polymarketUrl && (
          <a
            href={market.polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/5 transition text-white/30 hover:text-white/60"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Question */}
      <Link href={`/predictions/${market.id}`}>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 leading-snug hover:text-white/90 transition cursor-pointer line-clamp-2">
          {market.question}
        </h3>
      </Link>

      {/* Price Display */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[rgb(var(--yes-green))]">
              {yesPercent}%
            </span>
            <span className="text-sm text-white/40">Yes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/40">No</span>
            <span className="text-2xl font-bold text-[rgb(var(--no-red))]">
              {100 - yesPercent}%
            </span>
          </div>
        </div>
        
        {/* Price Bar */}
        <div className="price-bar">
          <div
            className="price-bar-fill"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-5 mb-5 text-sm">
        <div className="flex items-center gap-1.5 text-white/50">
          <TrendingUp className="w-4 h-4" />
          <span>{formatVolume(market.totalVolume)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/50">
          <Droplets className="w-4 h-4" />
          <span>{formatVolume(market.liquidity)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white/50">
          <Clock className="w-4 h-4" />
          <span>{isEnded ? 'Ended' : formatTimeLeft(market.endDate)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => openBettingModal(market, "YES")}
          disabled={isEnded}
          className="flex-1 btn-yes touch-target flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="font-bold">Bet YES</span>
          <span className="opacity-70 font-medium">{formatPrice(market.yesPrice)}</span>
        </button>
        <button
          onClick={() => openBettingModal(market, "NO")}
          disabled={isEnded}
          className="flex-1 btn-no touch-target flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <span className="font-bold">Bet NO</span>
          <span className="opacity-70 font-medium">{formatPrice(market.noPrice)}</span>
        </button>
      </div>
    </motion.div>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="market-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="h-7 bg-white/5 rounded w-full mb-2 animate-pulse" />
      <div className="h-7 bg-white/5 rounded w-3/4 mb-5 animate-pulse" />
      <div className="flex justify-between mb-2.5">
        <div className="h-8 w-16 rounded bg-white/5 animate-pulse" />
        <div className="h-8 w-16 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="h-2.5 bg-white/5 rounded w-full mb-5 animate-pulse" />
      <div className="flex gap-4 mb-5">
        <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1 h-12 rounded-xl bg-white/5 animate-pulse" />
        <div className="flex-1 h-12 rounded-xl bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

export function MarketCardCompact({ market, index = 0 }: MarketCardProps) {
  const { openBettingModal } = usePredictionStore();
  const yesPercent = Math.round(market.yesPrice * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="market-card p-4 flex items-center gap-4"
    >
      {market.imageUrl && (
        <img 
          src={market.imageUrl} 
          alt="" 
          className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <Link href={`/predictions/${market.id}`}>
          <h3 className="text-sm font-semibold text-white truncate hover:text-white/90 transition">
            {market.question}
          </h3>
        </Link>
        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
          <span className="text-[rgb(var(--yes-green))] font-semibold">{yesPercent}% Yes</span>
          <span>{formatVolume(market.totalVolume)} vol</span>
        </div>
      </div>
      
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => openBettingModal(market, "YES")}
          className="px-3 py-2 rounded-lg bg-[rgba(var(--yes-green),0.15)] text-[rgb(var(--yes-green))] text-sm font-semibold hover:bg-[rgba(var(--yes-green),0.25)] transition"
        >
          Yes
        </button>
        <button
          onClick={() => openBettingModal(market, "NO")}
          className="px-3 py-2 rounded-lg bg-[rgba(var(--no-red),0.15)] text-[rgb(var(--no-red))] text-sm font-semibold hover:bg-[rgba(var(--no-red),0.25)] transition"
        >
          No
        </button>
      </div>
    </motion.div>
  );
}
