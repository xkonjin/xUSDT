"use client";

import { Flame } from "lucide-react";

interface StreakBadgeProps {
  days: number;
  size?: "sm" | "md" | "lg";
}

const MILESTONES = [7, 14, 30, 60, 100];

export function StreakBadge({ days, size = "md" }: StreakBadgeProps) {
  if (days <= 0) return null;
  
  const isMilestone = MILESTONES.includes(days);
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className={`flex items-center rounded-full font-medium ${sizeClasses[size]} ${
        isMilestone
          ? "bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 text-orange-400"
          : "bg-white/5 text-white/70"
      }`}
    >
      <Flame className={`${iconSizes[size]} ${isMilestone ? "text-orange-400" : "text-white/50"}`} />
      <span className="font-bold">{days}</span>
      <span className="opacity-60">day{days !== 1 ? "s" : ""}</span>
    </div>
  );
}
