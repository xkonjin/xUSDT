"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Grid, List } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { MarketCard, MarketCardSkeleton, MarketCardCompact } from "@/components/MarketCard";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SearchBar } from "@/components/SearchBar";
import { BettingModal } from "@/components/BettingModal";
import { useMarkets } from "@/hooks/useMarkets";
import type { MarketCategory, MarketSortBy } from "@/lib/types";
import { MARKET_CATEGORIES } from "@/lib/constants";

const SORT_OPTIONS: { value: MarketSortBy; label: string }[] = [
  { value: "volume24h", label: "Trending" },
  { value: "volume", label: "Volume" },
  { value: "liquidity", label: "Liquidity" },
  { value: "endDate", label: "Ending Soon" },
  { value: "newest", label: "Newest" },
];

export default function PredictionsPage() {
  const [category, setCategory] = useState<MarketCategory>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<MarketSortBy>("volume24h");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useMarkets({
      category,
      search,
      sortBy,
      resolved: false,
    });

  const allMarkets = data?.pages.flatMap((page) => page.markets) || [];
  const currentCategory = MARKET_CATEGORIES.find((c) => c.id === category);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />

      {/* Hero Section */}
      <section className="px-4 pt-8 pb-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Markets
            </h1>
            <p className="text-white/50">
              Browse {allMarkets.length > 0 ? `${allMarkets.length}+` : ''} live prediction markets
            </p>
          </motion.div>

          {/* Search Bar */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-liquid w-full pl-12 pr-4"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl border transition ${
                showFilters
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as MarketSortBy)}
                    className="input-liquid text-sm py-2 px-3 pr-8 min-w-[140px]"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2 block">
                    View
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-white/10">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2.5 ${viewMode === "grid" ? "bg-white/10" : "bg-white/5 hover:bg-white/8"}`}
                    >
                      <Grid className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2.5 ${viewMode === "list" ? "bg-white/10" : "bg-white/5 hover:bg-white/8"}`}
                    >
                      <List className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Category Tabs */}
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <div className="flex gap-2 min-w-max">
              {MARKET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id as MarketCategory)}
                  className={`category-tab ${category === cat.id ? "active" : ""}`}
                >
                  <span className="mr-1.5">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Markets Grid */}
      <section className="px-4 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-white">
                {currentCategory?.emoji} {currentCategory?.label} Markets
              </span>
              {!isLoading && (
                <span className="text-sm text-white/40">
                  ({allMarkets.length})
                </span>
              )}
            </div>
          </div>

          {/* Markets */}
          {isLoading ? (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 lg:grid-cols-2 gap-5" 
              : "space-y-3"
            }>
              {Array.from({ length: 6 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
          ) : allMarkets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">🔮</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No markets found
              </h3>
              <p className="text-white/50">
                {search
                  ? "Try a different search term"
                  : "No active markets in this category"}
              </p>
            </motion.div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {allMarkets.map((market, i) => (
                <MarketCard 
                  key={market.id} 
                  market={market} 
                  index={i}
                  featured={i < 2}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {allMarkets.map((market, i) => (
                <MarketCardCompact key={market.id} market={market} index={i} />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasNextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="btn-secondary px-8"
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </section>

      <BottomNav />
      <BettingModal />
    </div>
  );
}
