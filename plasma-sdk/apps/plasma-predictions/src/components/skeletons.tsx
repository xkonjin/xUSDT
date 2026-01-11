"use client";

export function MarketCardSkeleton() {
  return (
    <div className="market-card p-5 animate-pulse">
      {/* Category badge */}
      <div className="flex justify-between mb-3">
        <div className="h-5 w-16 bg-white/10 rounded-full" />
        <div className="h-5 w-20 bg-white/10 rounded-full" />
      </div>
      
      {/* Title */}
      <div className="h-6 w-3/4 bg-white/10 rounded mb-4" />
      
      {/* Probability bar */}
      <div className="flex gap-2 mb-4">
        <div className="h-10 flex-1 bg-white/10 rounded-xl" />
        <div className="h-10 flex-1 bg-white/10 rounded-xl" />
      </div>
      
      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <div className="h-4 w-16 bg-white/10 rounded" />
        <div className="h-4 w-16 bg-white/10 rounded" />
        <div className="h-4 w-16 bg-white/10 rounded" />
      </div>
      
      {/* Buttons */}
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-white/10 rounded-xl" />
        <div className="h-10 flex-1 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}

export function MarketListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BetCardSkeleton() {
  return (
    <div className="liquid-metal p-4 rounded-xl animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="h-4 w-24 bg-white/10 rounded" />
        <div className="h-4 w-16 bg-white/10 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-white/10 rounded mb-2" />
      <div className="h-4 w-1/2 bg-white/10 rounded" />
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="h-8 w-8 bg-white/10 rounded-full" />
      <div className="flex-1">
        <div className="h-4 w-32 bg-white/10 rounded mb-1" />
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
      <div className="h-5 w-20 bg-white/10 rounded" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white/5 animate-pulse">
      <div className="h-3 w-16 bg-white/10 rounded mb-2" />
      <div className="h-6 w-24 bg-white/10 rounded" />
    </div>
  );
}
