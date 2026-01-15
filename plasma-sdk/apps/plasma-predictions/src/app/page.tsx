"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { useMarkets } from "@/hooks/useMarkets";
import { useBalance, formatBalance } from "@/hooks/useBalance";
import { MarketCard, MarketCardSkeleton } from "@/components/MarketCard";
import { BettingModal } from "@/components/BettingModal";
import { usePredictionStore } from "@/lib/store";
import { MARKET_CATEGORIES } from "@/lib/constants";
import type { MarketCategory } from "@/lib/types";

// Header Component
function Header() {
  const { balance, resetBalance } = useBalance();
  
  return (
    <header className="glass-header sticky top-0 z-40 px-4 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white">
            Pledictions
          </span>
        </div>
        
        {/* Balance */}
        <button 
          onClick={resetBalance}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          title="Click to reset balance"
        >
          <Wallet className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-white">{formatBalance(balance)}</span>
        </button>
      </div>
    </header>
  );
}

// Category Filter Tabs
function CategoryTabs() {
  const { selectedCategory, setCategory } = usePredictionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener('scroll', checkScroll);
    return () => ref?.removeEventListener('scroll', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative mb-6">
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scrollable Categories */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto hide-scrollbar px-1 py-1"
      >
        {MARKET_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id as MarketCategory)}
            className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Fade Edges */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0f0a1e] to-transparent pointer-events-none" />
      )}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0f0a1e] to-transparent pointer-events-none" />
      )}
    </div>
  );
}

// Markets Grid
function MarketsGrid() {
  const { selectedCategory } = usePredictionStore();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMarkets({
    category: selectedCategory,
    sortBy: "volume",
  });

  const markets = data?.pages.flatMap((page) => page.markets) ?? [];

  return (
    <div>
      {/* Results Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h2 className="font-display text-lg font-semibold text-white">
            {selectedCategory === "all" ? "All Markets" : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Markets`}
          </h2>
        </div>
        {!isLoading && (
          <span className="text-sm text-white/50">
            {markets.length} markets
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))
          : markets.map((market, i) => (
              <MarketCard key={market.id} market={market} index={i} />
            ))}
      </div>

      {/* Empty State */}
      {!isLoading && markets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/60 text-lg">No markets found</p>
          <p className="text-white/40 text-sm mt-1">Try selecting a different category</p>
        </motion.div>
      )}

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn-secondary px-8 py-3"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              "Load More Markets"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Main Page
export default function HomePage() {
  return (
    <div className="min-h-dvh pb-8">
      <Header />
      
      {/* Hero Section */}
      <section className="px-4 py-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
            <span className="badge-live">Live</span>
            <span className="text-sm text-purple-300">Real Polymarket data</span>
          </div>
          
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            Predict the Future.{" "}
            <span className="text-gradient">Win Big.</span>
          </h1>
          
          <p className="text-white/50 text-base max-w-md mx-auto">
            Bet on real-world events. Politics, crypto, sports & more.
          </p>
        </motion.div>
      </section>
      
      {/* Main Content */}
      <main className="px-4 max-w-5xl mx-auto">
        <CategoryTabs />
        <MarketsGrid />
      </main>
      
      {/* Betting Modal */}
      <BettingModal />
    </div>
  );
}
