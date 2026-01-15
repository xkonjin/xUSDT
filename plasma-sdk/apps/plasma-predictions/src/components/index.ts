// Core components
export { Header } from "./Header";
export { BottomNav } from "./BottomNav";
export { MarketCard, MarketCardSkeleton, MarketCardCompact } from "./MarketCard";
export { BetCard } from "./BetCard";
export { BettingModal } from "./BettingModal";
export { CashOutModal } from "./CashOutModal";
export { SearchBar } from "./SearchBar";
export { CategoryTabs } from "./CategoryTabs";
export { DemoModeBanner } from "./DemoModeBanner";
export { OddsBar, OddsBarInline } from "./OddsBar";

// Charts & Visualization
export { Sparkline } from "./Sparkline";
export { PriceChart } from "./PriceChart";
export { MarketDepth } from "./MarketDepth";

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

// Sharing
export { ShareButton } from "./ShareButton";

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

// Market Comparison
export { PolymarketComparison } from "./PolymarketComparison";

// Gasless
export { GaslessBadge, SponsoredByPlasma } from "./GaslessBadge";

// Wallet Connection
export { WalletModal } from "./WalletModal";

// Resolution
export { ResolutionCard, ResolutionNotification } from "./ResolutionCard";
