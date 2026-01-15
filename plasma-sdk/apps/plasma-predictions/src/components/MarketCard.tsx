"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Clock, TrendingUp } from "lucide-react";
import Image from "next/image";
import type { PredictionMarket } from "@/lib/types";
import { formatVolume, formatTimeLeft } from "@/lib/constants";
import { usePredictionStore } from "@/lib/store";
import { OddsBar } from "./OddsBar";

interface MarketCardProps {
  market: PredictionMarket;
  index?: number;
  featured?: boolean;
}

function MarketCardComponent({ market, index = 0 }: MarketCardProps) {
  const { openBettingModal } = usePredictionStore();
  const yesPercent = Math.round(market.yesPrice * 100);

  // Get category display
  const getCategoryDisplay = (category: string) => {
    const categories: Record<string, { emoji: string; label: string }> = {
      politics: { emoji: "🗳️", label: "Politics" },
      crypto: { emoji: "₿", label: "Crypto" },
      sports: { emoji: "⚽", label: "Sports" },
      tech: { emoji: "💻", label: "Tech" },
      entertainment: { emoji: "🎬", label: "Entertainment" },
      science: { emoji: "🔬", label: "Science" },
      finance: { emoji: "📈", label: "Finance" },
    };
    return categories[category] || { emoji: "🔮", label: category };
  };

  const category = getCategoryDisplay(market.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => openBettingModal(market, "YES")}
      className="market-card cursor-pointer overflow-hidden"
    >
      {/* Market Image */}
      {market.imageUrl && (
        <div className="relative h-36 w-full overflow-hidden">
          <Image
            src={market.imageUrl}
            alt={market.question}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Category Pill */}
          <div className="absolute top-3 left-3">
            <span className="category-pill text-xs">
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </span>
          </div>
          
          {/* Time Badge */}
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-xs text-white/90">
              <Clock className="w-3 h-3" />
              {formatTimeLeft(market.endDate)}
            </span>
          </div>
        </div>
      )}
      
      <div className="p-4">
        {/* Question Title */}
        <h3 className="font-display text-base font-semibold text-white mb-3 leading-snug line-clamp-2 min-h-[2.75rem]">
          {market.question}
        </h3>

        {/* Odds Bar */}
        <div className="mb-4">
          <OddsBar yesPercent={yesPercent} size="md" />
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm">
          {/* Volume */}
          <div className="flex items-center gap-1.5 text-white/60">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="font-medium">{formatVolume(market.totalVolume)}</span>
            <span className="text-white/40">volume</span>
          </div>
          
          {/* Quick Bet Hint */}
          <span className="text-xs text-purple-400 font-medium">
            Tap to bet →
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export const MarketCard = memo(MarketCardComponent);
MarketCard.displayName = "MarketCard";

// Compact version for smaller displays
function MarketCardCompactComponent({ market, index = 0 }: MarketCardProps) {
  const { openBettingModal } = usePredictionStore();
  const yesPercent = Math.round(market.yesPrice * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={() => openBettingModal(market, "YES")}
      className="glass-card p-4 cursor-pointer"
    >
      <h3 className="font-display text-sm font-semibold text-white mb-2 line-clamp-2">
        {market.question}
      </h3>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-bold">{yesPercent}%</span>
          <span className="text-white/40 text-xs">YES</span>
        </div>
        <span className="text-xs text-white/50">{formatVolume(market.totalVolume)}</span>
      </div>
    </motion.div>
  );
}

export const MarketCardCompact = memo(MarketCardCompactComponent);
MarketCardCompact.displayName = "MarketCardCompact";

export function MarketCardSkeleton() {
  return (
    <div className="market-card overflow-hidden">
      {/* Image skeleton */}
      <div className="h-36 w-full bg-white/5 animate-pulse" />
      
      <div className="p-4">
        {/* Title skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-white/10 rounded w-full animate-pulse" />
          <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
        </div>
        
        {/* Odds bar skeleton */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <div className="h-3 bg-white/10 rounded w-16 animate-pulse" />
            <div className="h-3 bg-white/10 rounded w-16 animate-pulse" />
          </div>
          <div className="h-2 bg-white/10 rounded-full animate-pulse" />
        </div>
        
        {/* Stats skeleton */}
        <div className="flex justify-between">
          <div className="h-4 bg-white/10 rounded w-20 animate-pulse" />
          <div className="h-4 bg-white/10 rounded w-16 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
