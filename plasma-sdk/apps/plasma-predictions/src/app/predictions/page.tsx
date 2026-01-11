"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { SearchBar } from "@/components/SearchBar";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MarketCard, MarketCardSkeleton } from "@/components/MarketCard";
import { BettingModal } from "@/components/BettingModal";
import { useMarkets } from "@/hooks/useMarkets";
import { usePredictionStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

export default function PredictionsPage() {
  const { selectedCategory, searchQuery } = usePredictionStore();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(
    () => ({
      category: selectedCategory,
      search: searchQuery,
      resolved: false,
    }),
    [selectedCategory, searchQuery]
  );

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMarkets(filters);

  const allMarkets = useMemo(
    () => data?.pages.flatMap((page) => page.markets) ?? [],
    [data]
  );

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <SearchBar />
        </div>

        {/* Categories */}
        <div className="mb-6">
          <CategoryTabs />
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">
            {selectedCategory === "all"
              ? "All Markets"
              : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Markets`}
          </h1>
          {!isLoading && (
            <span className="text-white/50 text-sm">
              {allMarkets.length} market{allMarkets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))
            : allMarkets.map((market, i) => (
                <MarketCard key={market.id} market={market} index={i} />
              ))}
        </div>

        {/* Empty State */}
        {!isLoading && allMarkets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/50 text-lg mb-2">No markets found</p>
            <p className="text-white/30 text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="py-8 flex justify-center">
          {isFetchingNextPage && (
            <Loader2 className="w-6 h-6 text-prediction-primary animate-spin" />
          )}
        </div>
      </main>

      <BottomNav />
      <BettingModal />
    </div>
  );
}
