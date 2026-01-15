"use client";

import { Clock, Trophy, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";

interface WeeklyCompetitionProps {
  userRank?: number;
  userPoints?: number;
  prizePool: number;
  endsAt: Date;
  totalParticipants: number;
}

export function WeeklyCompetition({
  userRank,
  userPoints = 0,
  prizePool,
  endsAt,
  totalParticipants,
}: WeeklyCompetitionProps) {
  const formatTimeLeft = () => {
    const diff = endsAt.getTime() - Date.now();
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const formatPrize = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount}`;
  };

  return (
    <div className="liquid-metal p-6 rounded-2xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-bold text-white">Weekly Competition</h3>
        </div>
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Clock className="w-4 h-4" />
          <span>{formatTimeLeft()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {userRank ? `#${userRank}` : "—"}
          </p>
          <p className="text-xs text-white/50">Your Rank</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {userPoints.toLocaleString()}
          </p>
          <p className="text-xs text-white/50">Points</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">
            {formatPrize(prizePool)}
          </p>
          <p className="text-xs text-white/50">Prize Pool</p>
        </div>
      </div>

      {/* Participants */}
      <div className="flex items-center justify-center gap-2 text-sm text-white/50 mb-4">
        <TrendingUp className="w-4 h-4" />
        <span>{totalParticipants.toLocaleString()} participants this week</span>
      </div>

      {/* CTA */}
      <Link
        href="/leaderboard"
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <span>View Leaderboard</span>
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
