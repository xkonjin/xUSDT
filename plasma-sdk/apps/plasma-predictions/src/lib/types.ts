export interface PredictionMarket {
  id: string;
  polymarketId?: string;
  conditionId: string;
  question: string;
  description?: string;
  category: MarketCategory;
  endDate: string;
  resolved: boolean;
  outcome?: "YES" | "NO";
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  totalVolume: number;
  liquidity: number;
  imageUrl?: string;
  polymarketUrl?: string;
  ammAddress?: string;
  createdAt: string;
}

export type MarketCategory =
  | "all"
  | "politics"
  | "crypto"
  | "sports"
  | "tech"
  | "entertainment"
  | "science"
  | "finance";

export interface Bet {
  id: string;
  marketId: string;
  market: PredictionMarket;
  userAddress: string;
  outcome: "YES" | "NO";
  shares: number;
  costBasis: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  status: BetStatus;
  placedAt: string;
  resolvedAt?: string;
  txHash: string;
}

export type BetStatus = "active" | "won" | "lost" | "cashed_out";

export interface LPPosition {
  id: string;
  marketId: string;
  market: PredictionMarket;
  userAddress: string;
  lpTokens: number;
  depositedAmount: number;
  currentValue: number;
  feesEarned: number;
  apy: number;
  depositedAt: string;
}

export interface UserStats {
  address: string;
  totalBets: number;
  activeBets: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  portfolioValue: number;
  totalPnl: number;
  rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string;
  profit: number;
  accuracy: number;
  totalBets: number;
  volume: number;
}

export interface MarketFilters {
  category?: MarketCategory;
  search?: string;
  sortBy?: MarketSortBy;
  resolved?: boolean;
}

export type MarketSortBy = "volume" | "volume24h" | "endDate" | "liquidity" | "newest";

export interface UserBet {
  id: string;
  marketId: string;
  market?: PredictionMarket;
  userAddress: string;
  outcome: "YES" | "NO";
  shares: number;
  amount: number;
  status: "active" | "won" | "lost" | "cashed_out";
  createdAt: string;
  settledAt?: string;
  txHash: string;
}

export interface PlaceBetParams {
  marketId: string;
  outcome: "YES" | "NO";
  amount: bigint;
  minAmountOut: bigint;
}

export interface CashOutParams {
  betId: string;
  shares: bigint;
  minAmountOut: bigint;
}

export interface TransferAuthorizationParams {
  from: string;
  to: string;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: string;
}

export interface BetSubmission {
  authorization: TransferAuthorizationParams;
  signature: {
    v: number;
    r: string;
    s: string;
  };
  marketId: string;
  outcome: "YES" | "NO";
  minAmountOut: string;
}

export interface BetResult {
  success: boolean;
  txHash?: string;
  shares?: number;
  error?: string;
}
