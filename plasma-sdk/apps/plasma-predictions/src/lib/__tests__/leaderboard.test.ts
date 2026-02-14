import { act, renderHook } from "@testing-library/react";
import { useLeaderboardStore, calculateUserStats } from "../leaderboard-store";
import type { DemoBet } from "../demo-store";
import type { PredictionMarket } from "../types";

// Mock market for testing
const mockMarket: PredictionMarket = {
  id: "test-market-1",
  conditionId: "cond-1",
  question: "Will Bitcoin reach $100k?",
  category: "crypto",
  endDate: "2025-12-31T23:59:59Z",
  resolved: false,
  yesPrice: 0.65,
  noPrice: 0.35,
  volume24h: 50000,
  totalVolume: 1000000,
  liquidity: 500000,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("Leaderboard Store", () => {
  beforeEach(() => {
    // Reset the store state before each test
    const { result } = renderHook(() => useLeaderboardStore());
    act(() => {
      result.current.resetLeaderboard();
    });
  });

  describe("User Stats Tracking", () => {
    it("should have empty leaderboard initially", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      expect(result.current.users).toEqual([]);
    });

    it("should add a new user with initial stats", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      const address = "0x1234567890abcdef1234567890abcdef12345678";

      act(() => {
        result.current.updateUserStats(address, {
          totalProfit: 100,
          totalVolume: 500,
          winCount: 2,
          lossCount: 1,
        });
      });

      expect(result.current.users.length).toBe(1);
      expect(result.current.users[0].address).toBe(address);
      expect(result.current.users[0].totalProfit).toBe(100);
      expect(result.current.users[0].totalVolume).toBe(500);
      expect(result.current.users[0].winCount).toBe(2);
      expect(result.current.users[0].lossCount).toBe(1);
    });

    it("should update existing user stats", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      const address = "0x1234567890abcdef1234567890abcdef12345678";

      act(() => {
        result.current.updateUserStats(address, {
          totalProfit: 100,
          totalVolume: 500,
          winCount: 2,
          lossCount: 1,
        });
      });

      act(() => {
        result.current.updateUserStats(address, {
          totalProfit: 150,
          totalVolume: 750,
          winCount: 3,
          lossCount: 1,
        });
      });

      expect(result.current.users.length).toBe(1);
      expect(result.current.users[0].totalProfit).toBe(150);
      expect(result.current.users[0].totalVolume).toBe(750);
      expect(result.current.users[0].winCount).toBe(3);
    });

    it("should track multiple users", () => {
      const { result } = renderHook(() => useLeaderboardStore());

      act(() => {
        result.current.updateUserStats("0xuser1", {
          totalProfit: 100,
          totalVolume: 500,
          winCount: 2,
          lossCount: 1,
        });
        result.current.updateUserStats("0xuser2", {
          totalProfit: 200,
          totalVolume: 300,
          winCount: 1,
          lossCount: 0,
        });
      });

      expect(result.current.users.length).toBe(2);
    });
  });

  describe("Sorting Leaderboard", () => {
    beforeEach(() => {
      const { result } = renderHook(() => useLeaderboardStore());
      act(() => {
        result.current.updateUserStats("0xuser1", {
          totalProfit: 100,
          totalVolume: 500,
          winCount: 2,
          lossCount: 1,
        });
        result.current.updateUserStats("0xuser2", {
          totalProfit: 300,
          totalVolume: 200,
          winCount: 3,
          lossCount: 0,
        });
        result.current.updateUserStats("0xuser3", {
          totalProfit: 200,
          totalVolume: 1000,
          winCount: 5,
          lossCount: 5,
        });
      });
    });

    it("should get top users sorted by profit", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      const top = result.current.getTopUsersByProfit(10);

      expect(top[0].address).toBe("0xuser2");
      expect(top[1].address).toBe("0xuser3");
      expect(top[2].address).toBe("0xuser1");
    });

    it("should get top users sorted by volume", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      const top = result.current.getTopUsersByVolume(10);

      expect(top[0].address).toBe("0xuser3");
      expect(top[1].address).toBe("0xuser1");
      expect(top[2].address).toBe("0xuser2");
    });

    it("should get top users sorted by win rate", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      const top = result.current.getTopUsersByWinRate(10);

      // user2: 3/3 = 100%, user1: 2/3 = 66.7%, user3: 5/10 = 50%
      expect(top[0].address).toBe("0xuser2");
      expect(top[1].address).toBe("0xuser1");
      expect(top[2].address).toBe("0xuser3");
    });

    it("should limit results to requested count", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      const top = result.current.getTopUsersByProfit(2);

      expect(top.length).toBe(2);
    });
  });

  describe("Win Rate Calculation", () => {
    it("should calculate win rate as 0 for users with no resolved bets", () => {
      const { result } = renderHook(() => useLeaderboardStore());

      act(() => {
        result.current.updateUserStats("0xuser1", {
          totalProfit: 0,
          totalVolume: 500,
          winCount: 0,
          lossCount: 0,
        });
      });

      const top = result.current.getTopUsersByWinRate(10);
      expect(top[0].winRate).toBe(0);
    });

    it("should calculate win rate correctly", () => {
      const { result } = renderHook(() => useLeaderboardStore());

      act(() => {
        result.current.updateUserStats("0xuser1", {
          totalProfit: 100,
          totalVolume: 500,
          winCount: 7,
          lossCount: 3,
        });
      });

      const user = result.current.users[0];
      expect(user.winRate).toBeCloseTo(0.7, 2);
    });
  });

  describe("Time Filter Support", () => {
    it("should have default filter set to all", () => {
      const { result } = renderHook(() => useLeaderboardStore());
      expect(result.current.timeFilter).toBe("all");
    });

    it("should change time filter", () => {
      const { result } = renderHook(() => useLeaderboardStore());

      act(() => {
        result.current.setTimeFilter("day");
      });
      expect(result.current.timeFilter).toBe("day");

      act(() => {
        result.current.setTimeFilter("week");
      });
      expect(result.current.timeFilter).toBe("week");

      act(() => {
        result.current.setTimeFilter("month");
      });
      expect(result.current.timeFilter).toBe("month");
    });
  });

  describe("Reset Leaderboard", () => {
    it("should clear all users", () => {
      const { result } = renderHook(() => useLeaderboardStore());

      act(() => {
        result.current.updateUserStats("0xuser1", {
          totalProfit: 100,
          totalVolume: 500,
          winCount: 2,
          lossCount: 1,
        });
      });

      expect(result.current.users.length).toBe(1);

      act(() => {
        result.current.resetLeaderboard();
      });

      expect(result.current.users.length).toBe(0);
    });
  });
});

describe("calculateUserStats", () => {
  it("should calculate stats from resolved bets", () => {
    const bets: DemoBet[] = [
      {
        id: "bet1",
        marketId: "market1",
        market: mockMarket,
        outcome: "YES",
        amount: 100,
        shares: 153.85, // 100 / 0.65
        price: 0.65,
        status: "won",
        placedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      },
      {
        id: "bet2",
        marketId: "market2",
        market: mockMarket,
        outcome: "NO",
        amount: 50,
        shares: 142.86,
        price: 0.35,
        status: "lost",
        placedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
      },
    ];

    const stats = calculateUserStats(bets);

    expect(stats.winCount).toBe(1);
    expect(stats.lossCount).toBe(1);
    expect(stats.totalVolume).toBe(150);
    // Profit from win: shares - amount = 153.85 - 100 = 53.85
    // Loss: -50
    // Total: 53.85 - 50 = 3.85
    expect(stats.totalProfit).toBeCloseTo(53.85 - 50, 2);
  });

  it("should ignore active bets in stats calculation", () => {
    const bets: DemoBet[] = [
      {
        id: "bet1",
        marketId: "market1",
        market: mockMarket,
        outcome: "YES",
        amount: 100,
        shares: 153.85,
        price: 0.65,
        status: "active",
        placedAt: new Date().toISOString(),
      },
    ];

    const stats = calculateUserStats(bets);

    expect(stats.winCount).toBe(0);
    expect(stats.lossCount).toBe(0);
    expect(stats.totalVolume).toBe(100);
    expect(stats.totalProfit).toBe(0);
  });

  it("should handle cashed out bets", () => {
    const bets: DemoBet[] = [
      {
        id: "bet1",
        marketId: "market1",
        market: mockMarket,
        outcome: "YES",
        amount: 100,
        shares: 153.85,
        price: 0.65,
        status: "cashed_out",
        placedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        cashOutPrice: 0.70,
        cashOutValue: 107.695, // shares * cashOutPrice
      },
    ];

    const stats = calculateUserStats(bets);

    // Profit from cash out: cashOutValue - amount = 107.695 - 100 = 7.695
    expect(stats.totalProfit).toBeCloseTo(7.695, 2);
  });

  it("should return zero stats for empty bets", () => {
    const stats = calculateUserStats([]);

    expect(stats.winCount).toBe(0);
    expect(stats.lossCount).toBe(0);
    expect(stats.totalVolume).toBe(0);
    expect(stats.totalProfit).toBe(0);
  });
});
