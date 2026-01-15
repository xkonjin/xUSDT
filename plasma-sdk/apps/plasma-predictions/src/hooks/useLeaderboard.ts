import { useState, useEffect, useCallback } from "react";
import {
  useLeaderboardStore,
  calculateUserStats,
  type LeaderboardUser,
  type LeaderboardTimeFilter,
} from "@/lib/leaderboard-store";
import { useDemoStore } from "@/lib/demo-store";
import type { LeaderboardEntry, LeaderboardResponse } from "@/app/api/leaderboard/route";

export type LeaderboardSort = "profit" | "winRate" | "volume";

export interface UseLeaderboardOptions {
  sortBy?: LeaderboardSort;
  period?: LeaderboardTimeFilter;
  limit?: number;
}

export interface UseLeaderboardReturn {
  leaders: LeaderboardEntry[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  sortBy: LeaderboardSort;
  period: LeaderboardTimeFilter;
  setSortBy: (sort: LeaderboardSort) => void;
  setPeriod: (period: LeaderboardTimeFilter) => void;
}

/**
 * Hook for fetching and managing leaderboard data
 * Uses demo mode data from local store when demo mode is enabled,
 * otherwise fetches from API
 */
export function useLeaderboard(
  options: UseLeaderboardOptions = {}
): UseLeaderboardReturn {
  const {
    sortBy: initialSortBy = "profit",
    period: initialPeriod = "all",
    limit = 100,
  } = options;

  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sortBy, setSortBy] = useState<LeaderboardSort>(initialSortBy);
  const [period, setPeriod] = useState<LeaderboardTimeFilter>(initialPeriod);

  const { isDemoMode, getDemoStats, demoBets } = useDemoStore();
  const { getTopUsersByProfit, getTopUsersByVolume, getTopUsersByWinRate } = useLeaderboardStore();

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In demo mode, use local store data
      if (isDemoMode) {
        // Get demo user stats from the demo store
        const demoStats = getDemoStats();
        const demoAddress = "0xDemoUser" + "0".repeat(32); // Placeholder demo address

        // Create leaderboard entry for demo user
        const demoEntry: LeaderboardEntry = {
          rank: 1,
          address: demoAddress,
          totalProfit: demoStats.totalProfit,
          totalVolume: demoStats.totalWagered,
          winCount: demoStats.wins,
          lossCount: demoStats.losses,
          winRate: demoStats.winRate,
          totalBets: demoStats.totalBets,
        };

        // Get other users from leaderboard store
        let storeUsers: LeaderboardUser[] = [];
        switch (sortBy) {
          case "volume":
            storeUsers = getTopUsersByVolume(limit);
            break;
          case "winRate":
            storeUsers = getTopUsersByWinRate(limit);
            break;
          default:
            storeUsers = getTopUsersByProfit(limit);
        }

        // Convert store users to leaderboard entries
        const entries: LeaderboardEntry[] = storeUsers.map((user, index) => ({
          rank: index + 1,
          address: user.address,
          totalProfit: user.totalProfit,
          totalVolume: user.totalVolume,
          winCount: user.winCount,
          lossCount: user.lossCount,
          winRate: user.winRate,
          totalBets: user.winCount + user.lossCount,
        }));

        // Add demo user if they have any bets
        if (demoStats.totalBets > 0) {
          // Insert demo user in the right position based on sort
          let insertIndex = 0;
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            let shouldInsert = false;

            switch (sortBy) {
              case "volume":
                shouldInsert = demoEntry.totalVolume > entry.totalVolume;
                break;
              case "winRate":
                shouldInsert = demoEntry.winRate > entry.winRate;
                break;
              default:
                shouldInsert = demoEntry.totalProfit > entry.totalProfit;
            }

            if (shouldInsert) {
              insertIndex = i;
              break;
            }
            insertIndex = i + 1;
          }

          entries.splice(insertIndex, 0, demoEntry);

          // Update ranks
          entries.forEach((entry, index) => {
            entry.rank = index + 1;
          });
        }

        setLeaders(entries.slice(0, limit));
      } else {
        // Fetch from API
        const params = new URLSearchParams({
          sortBy,
          period,
          limit: limit.toString(),
        });

        const response = await fetch(`/api/leaderboard?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }

        const data: LeaderboardResponse = await response.json();
        setLeaders(data.leaderboard);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [
    isDemoMode,
    getDemoStats,
    getTopUsersByProfit,
    getTopUsersByVolume,
    getTopUsersByWinRate,
    sortBy,
    period,
    limit,
  ]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Re-fetch when demo bets change
  useEffect(() => {
    if (isDemoMode) {
      fetchLeaderboard();
    }
  }, [demoBets, isDemoMode, fetchLeaderboard]);

  return {
    leaders,
    isLoading,
    error,
    refetch: fetchLeaderboard,
    sortBy,
    period,
    setSortBy,
    setPeriod,
  };
}

/**
 * Hook to update user stats when bets are resolved
 */
export function useUpdateLeaderboardStats() {
  const leaderboardStore = useLeaderboardStore();
  const demoStore = useDemoStore();

  const demoBets = demoStore.demoBets;
  const updateUserStats = leaderboardStore.updateUserStats;
  
  const updateStats = useCallback(
    (userAddress: string) => {
      // Calculate stats from demo bets
      const stats = calculateUserStats(demoBets);
      updateUserStats(userAddress, stats);
    },
    [updateUserStats, demoBets]
  );

  return updateStats;
}
