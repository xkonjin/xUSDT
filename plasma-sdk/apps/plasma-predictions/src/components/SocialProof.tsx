"use client";

import { Users, Flame, TrendingUp } from "lucide-react";
import { formatAddress } from "@/lib/constants";

interface PredictorCountProps {
  total: number;
  today?: number;
}

export function PredictorCount({ total, today }: PredictorCountProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/50">
      <Users className="w-3.5 h-3.5" />
      <span>{total.toLocaleString()} predictors</span>
      {today && today > 0 && (
        <>
          <span className="text-white/30">•</span>
          <span className="text-green-400">+{today} today</span>
        </>
      )}
    </div>
  );
}

interface TrendingBadgeProps {
  volume24h: number;
  threshold?: number;
}

export function TrendingBadge({ volume24h, threshold = 100000 }: TrendingBadgeProps) {
  if (volume24h < threshold) return null;
  
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-medium">
      <Flame className="w-3 h-3" />
      <span>Trending</span>
    </div>
  );
}

interface RecentBet {
  user: string;
  outcome: "YES" | "NO";
  amount: number;
  timestamp: Date;
}

interface RecentActivityProps {
  bets: RecentBet[];
  maxItems?: number;
}

export function RecentActivity({ bets, maxItems = 5 }: RecentActivityProps) {
  const displayBets = bets.slice(0, maxItems);
  
  if (displayBets.length === 0) return null;

  const formatTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white/50 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Recent Activity
      </h4>
      <div className="space-y-2">
        {displayBets.map((bet, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex-shrink-0" />
            <span className="text-white/60">{formatAddress(bet.user, 4)}</span>
            <span className={`font-medium ${bet.outcome === "YES" ? "text-green-400" : "text-red-400"}`}>
              bet {bet.outcome}
            </span>
            <span className="text-white/40 text-xs">{formatTime(bet.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface OutcomeBreakdownProps {
  yesCount: number;
  noCount: number;
}

export function OutcomeBreakdown({ yesCount, noCount }: OutcomeBreakdownProps) {
  const total = yesCount + noCount;
  const yesPercent = total > 0 ? Math.round((yesCount / total) * 100) : 50;

  return (
    <div className="p-3 bg-white/5 rounded-xl">
      <div className="flex justify-between text-xs text-white/50 mb-2">
        <span>{yesCount} YES</span>
        <span>{noCount} NO</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
        <div 
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${yesPercent}%` }}
        />
        <div 
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${100 - yesPercent}%` }}
        />
      </div>
    </div>
  );
}
