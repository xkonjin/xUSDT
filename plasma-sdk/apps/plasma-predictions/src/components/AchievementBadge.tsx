"use client";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "volume" | "accuracy" | "streak" | "special";
}

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  progress?: number;
  size?: "sm" | "md";
}

export function AchievementBadge({ 
  achievement, 
  unlocked, 
  progress, 
  size = "md" 
}: AchievementBadgeProps) {
  const isSmall = size === "sm";
  
  return (
    <div
      className={`relative rounded-xl border transition-all ${
        unlocked
          ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
          : "bg-white/5 border-white/10 opacity-60"
      } ${isSmall ? "p-3" : "p-4"}`}
    >
      <div className={`${isSmall ? "text-2xl mb-1" : "text-3xl mb-2"}`}>
        {achievement.icon}
      </div>
      <h4 className={`font-semibold text-white ${isSmall ? "text-sm" : ""}`}>
        {achievement.name}
      </h4>
      <p className={`text-white/50 ${isSmall ? "text-xs" : "text-xs mt-1"}`}>
        {achievement.description}
      </p>

      {!unlocked && progress !== undefined && progress > 0 && (
        <div className="mt-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/30 mt-1">{Math.round(progress)}% complete</p>
        </div>
      )}

      {unlocked && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <span className="text-xs">✓</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Predefined achievements
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_bet", name: "First Bet", description: "Place your first prediction", icon: "🎯", category: "volume" },
  { id: "active_trader", name: "Active Trader", description: "Place 10 bets", icon: "📊", category: "volume" },
  { id: "power_predictor", name: "Power Predictor", description: "Place 100 bets", icon: "🔮", category: "volume" },
  { id: "whale", name: "Whale", description: "$10K total volume", icon: "🐋", category: "volume" },
  { id: "lucky_guess", name: "Lucky Guess", description: "Win your first bet", icon: "🍀", category: "accuracy" },
  { id: "sharp_mind", name: "Sharp Mind", description: "Win 10 bets", icon: "🧠", category: "accuracy" },
  { id: "oracle", name: "Oracle", description: "50%+ win rate (20+ bets)", icon: "👁️", category: "accuracy" },
  { id: "on_fire", name: "On Fire", description: "7-day betting streak", icon: "🔥", category: "streak" },
  { id: "dedicated", name: "Dedicated", description: "30-day betting streak", icon: "💎", category: "streak" },
  { id: "early_adopter", name: "Early Adopter", description: "Joined during beta", icon: "⭐", category: "special" },
];
