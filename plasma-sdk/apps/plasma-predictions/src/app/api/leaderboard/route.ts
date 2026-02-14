import { NextRequest, NextResponse } from "next/server";
import { getLeaderboardData } from "@/lib/leaderboard-store";

export type LeaderboardSortBy = "profit" | "volume" | "winRate";
export type LeaderboardPeriod = "day" | "week" | "month" | "all";

export interface LeaderboardEntry {
  rank: number;
  address: string;
  totalProfit: number;
  totalVolume: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalBets: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  total: number;
  limit: number;
  sortBy: LeaderboardSortBy;
  period: LeaderboardPeriod;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters with defaults
    const sortBy = (searchParams.get("sortBy") as LeaderboardSortBy) || "profit";
    const period = (searchParams.get("period") as LeaderboardPeriod) || "all";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Get leaderboard data from store
    const users = getLeaderboardData();

    // Sort based on sortBy parameter
    const sortedUsers = [...users];
    switch (sortBy) {
      case "volume":
        sortedUsers.sort((a, b) => b.totalVolume - a.totalVolume);
        break;
      case "winRate":
        sortedUsers.sort((a, b) => b.winRate - a.winRate);
        break;
      case "profit":
      default:
        sortedUsers.sort((a, b) => b.totalProfit - a.totalProfit);
    }

    // Apply limit
    const limitedUsers = sortedUsers.slice(0, limit);

    // Transform to response format with ranks
    const leaderboard: LeaderboardEntry[] = limitedUsers.map((user, index) => ({
      rank: index + 1,
      address: user.address,
      totalProfit: user.totalProfit,
      totalVolume: user.totalVolume,
      winCount: user.winCount,
      lossCount: user.lossCount,
      winRate: user.winRate,
      totalBets: user.winCount + user.lossCount,
    }));

    const response: LeaderboardResponse = {
      leaderboard,
      total: users.length,
      limit,
      sortBy,
      period,
    };

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
