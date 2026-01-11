// Core components
export { Header } from "./Header";
export { BottomNav } from "./BottomNav";
export { MarketCard, MarketCardSkeleton, MarketCardCompact } from "./MarketCard";
export { BetCard } from "./BetCard";
export { BettingModal } from "./BettingModal";
export { SearchBar } from "./SearchBar";
export { CategoryTabs } from "./CategoryTabs";
export { DemoModeBanner } from "./DemoModeBanner";

// Charts & Visualization
export { Sparkline } from "./Sparkline";
export { PriceChart } from "./PriceChart";

// Transaction & State
export { TransactionProgress } from "./TransactionProgress";
export type { TxStatus, TxState } from "./TransactionProgress";
export { ErrorBoundary } from "./ErrorBoundary";

// Gamification
export { AchievementBadge, ACHIEVEMENTS } from "./AchievementBadge";
export type { Achievement } from "./AchievementBadge";
export { StreakBadge } from "./StreakBadge";
export { WeeklyCompetition } from "./WeeklyCompetition";

// Social Proof
export { PredictorCount, TrendingBadge, RecentActivity, OutcomeBreakdown } from "./SocialProof";

// UI Utilities
export { EmptyState } from "./EmptyState";
export {
  MarketCardSkeleton as MarketSkeleton,
  MarketListSkeleton,
  BetCardSkeleton,
  LeaderboardRowSkeleton,
  StatsCardSkeleton,
} from "./skeletons";

// Real-time Updates
export {
  LivePriceIndicator,
  ConnectionStatusBadge,
  PriceChangeAnimation,
} from "./LivePriceIndicator";
