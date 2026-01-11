"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  Users,
  ExternalLink,
  Share2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { BettingModal } from "@/components/BettingModal";
import { useMarket } from "@/hooks/useMarkets";
import { usePredictionStore } from "@/lib/store";
import {
  formatUSDT,
  formatPrice,
  formatTimeLeft,
  formatPercent,
} from "@/lib/constants";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.marketId as string;
  const { data: market, isLoading } = useMarket(marketId);
  const { openBettingModal } = usePredictionStore();

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 bg-white/10 rounded" />
            <div className="h-12 w-3/4 bg-white/10 rounded" />
            <div className="h-24 bg-white/10 rounded-xl" />
            <div className="h-48 bg-white/10 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-white/60 text-lg">Market not found</p>
          <Link
            href="/predictions"
            className="text-prediction-primary hover:underline mt-4 inline-block"
          >
            ← Back to Markets
          </Link>
        </div>
      </div>
    );
  }

  const yesPercent = Math.round(market.yesPrice * 100);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Back Button */}
        <Link
          href="/predictions"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

        {/* Market Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {market.question}
          </h1>

          {market.description && (
            <p className="text-white/60 text-sm mb-4">{market.description}</p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Ends {new Date(market.endDate).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              {formatUSDT(market.totalVolume)} volume
            </div>
            {market.polymarketUrl && (
              <a
                href={market.polymarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-prediction-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Polymarket
              </a>
            )}
          </div>
        </motion.div>

        {/* Price Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="liquid-glass rounded-2xl p-6 mb-6"
        >
          <div className="text-center mb-6">
            <p className="text-white/50 text-sm mb-2">Current Probability</p>
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-4xl font-bold text-yes">{yesPercent}%</p>
                <p className="text-white/50 text-sm">YES</p>
              </div>
              <div className="h-12 w-px bg-white/10" />
              <div>
                <p className="text-4xl font-bold text-no">{100 - yesPercent}%</p>
                <p className="text-white/50 text-sm">NO</p>
              </div>
            </div>
          </div>

          {/* Price Bar */}
          <div className="mb-6">
            <div className="price-bar h-3">
              <div
                className="price-bar-fill"
                style={{ width: `${yesPercent}%` }}
              />
            </div>
          </div>

          {/* Bet Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => openBettingModal(market, "YES")}
              className="btn-yes touch-target text-lg font-semibold"
            >
              Bet YES {formatPrice(market.yesPrice)}
            </button>
            <button
              onClick={() => openBettingModal(market, "NO")}
              className="btn-no touch-target text-lg font-semibold"
            >
              Bet NO {formatPrice(market.noPrice)}
            </button>
          </div>
        </motion.div>

        {/* Market Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <div className="stat-card">
            <p className="text-white/50 text-xs mb-1">24h Volume</p>
            <p className="text-white font-semibold">
              {formatUSDT(market.volume24h)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-white/50 text-xs mb-1">Total Volume</p>
            <p className="text-white font-semibold">
              {formatUSDT(market.totalVolume)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-white/50 text-xs mb-1">Liquidity</p>
            <p className="text-white font-semibold">
              {formatUSDT(market.liquidity)}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-white/50 text-xs mb-1">Time Left</p>
            <p className="text-white font-semibold">
              {formatTimeLeft(market.endDate)}
            </p>
          </div>
        </motion.div>

        {/* Polymarket Comparison */}
        {market.polymarketId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card p-4 mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs mb-1">Polymarket Price</p>
                <p className="text-white font-medium">
                  YES {formatPrice(market.yesPrice)} • NO{" "}
                  {formatPrice(market.noPrice)}
                </p>
              </div>
              <span className="badge-pending">Synced</span>
            </div>
          </motion.div>
        )}

        {/* Share Button */}
        <div className="flex justify-center">
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Market
          </button>
        </div>
      </main>

      <BottomNav />
      <BettingModal />
    </div>
  );
}
