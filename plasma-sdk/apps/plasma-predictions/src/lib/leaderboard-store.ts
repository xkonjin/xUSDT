import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { DemoBet } from "./demo-store";

const LEADERBOARD_STORAGE_KEY = "plasma-predictions-leaderboard";

export type LeaderboardTimeFilter = "day" | "week" | "month" | "all";

export interface UserStats {
  totalProfit: number;
  totalVolume: number;
  winCount: number;
  lossCount: number;
}

export interface LeaderboardUser {
  address: string;
  totalProfit: number;
  totalVolume: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  lastUpdated: string;
}

interface LeaderboardStore {
  users: LeaderboardUser[];
  timeFilter: LeaderboardTimeFilter;

  // Actions
  updateUserStats: (address: string, stats: UserStats) => void;
  setTimeFilter: (filter: LeaderboardTimeFilter) => void;
  getTopUsersByProfit: (limit: number) => LeaderboardUser[];
  getTopUsersByVolume: (limit: number) => LeaderboardUser[];
  getTopUsersByWinRate: (limit: number) => LeaderboardUser[];
  resetLeaderboard: () => void;
}

// Calculate win rate from win/loss counts
function calculateWinRate(winCount: number, lossCount: number): number {
  const total = winCount + lossCount;
  if (total === 0) return 0;
  return winCount / total;
}

export const useLeaderboardStore = create<LeaderboardStore>()(
  persist(
    (set, get) => ({
      users: [],
      timeFilter: "all",

      updateUserStats: (address: string, stats: UserStats) => {
        set((state) => {
          const existingIndex = state.users.findIndex(
            (u) => u.address === address
          );
          const winRate = calculateWinRate(stats.winCount, stats.lossCount);
          const newUser: LeaderboardUser = {
            address,
            totalProfit: stats.totalProfit,
            totalVolume: stats.totalVolume,
            winCount: stats.winCount,
            lossCount: stats.lossCount,
            winRate,
            lastUpdated: new Date().toISOString(),
          };

          if (existingIndex >= 0) {
            const updatedUsers = [...state.users];
            updatedUsers[existingIndex] = newUser;
            return { users: updatedUsers };
          } else {
            return { users: [...state.users, newUser] };
          }
        });
      },

      setTimeFilter: (filter: LeaderboardTimeFilter) => {
        set({ timeFilter: filter });
      },

      getTopUsersByProfit: (limit: number) => {
        const users = get().users;
        return [...users]
          .sort((a, b) => b.totalProfit - a.totalProfit)
          .slice(0, limit);
      },

      getTopUsersByVolume: (limit: number) => {
        const users = get().users;
        return [...users]
          .sort((a, b) => b.totalVolume - a.totalVolume)
          .slice(0, limit);
      },

      getTopUsersByWinRate: (limit: number) => {
        const users = get().users;
        return [...users].sort((a, b) => b.winRate - a.winRate).slice(0, limit);
      },

      resetLeaderboard: () => {
        set({ users: [], timeFilter: "all" });
      },
    }),
    {
      name: LEADERBOARD_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        users: state.users,
        timeFilter: state.timeFilter,
      }),
    }
  )
);

/**
 * Calculate user stats from their demo bets
 */
export function calculateUserStats(bets: DemoBet[]): UserStats {
  let totalProfit = 0;
  let totalVolume = 0;
  let winCount = 0;
  let lossCount = 0;

  for (const bet of bets) {
    totalVolume += bet.amount;

    if (bet.status === "won") {
      winCount++;
      // Profit from win: shares (pay $1 each) - amount wagered
      totalProfit += bet.shares - bet.amount;
    } else if (bet.status === "lost") {
      lossCount++;
      // Loss is the amount wagered
      totalProfit -= bet.amount;
    } else if (bet.status === "cashed_out" && bet.cashOutValue !== undefined) {
      // Profit from cash out: cashOutValue - amount wagered
      totalProfit += bet.cashOutValue - bet.amount;
    }
    // Active bets don't contribute to profit yet
  }

  return {
    totalProfit,
    totalVolume,
    winCount,
    lossCount,
  };
}

/**
 * Get leaderboard data for API endpoint
 * This function retrieves the current leaderboard state for server responses
 */
export function getLeaderboardData(): LeaderboardUser[] {
  // In a server context, we return empty as data is stored client-side
  // For real backend, this would query the database
  return [];
}
