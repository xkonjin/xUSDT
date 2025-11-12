/**
 * Leaderboard API Route
 * 
 * Gets leaderboard rankings (weekly/monthly/all-time).
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/api/db";

function getWeekId(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const week = getWeekNumber(d);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "weekly";
    const limit = parseInt(searchParams.get("limit") || "100");

    let querySql = "";
    let params: any[] = [];

    if (period === "weekly") {
      const weekId = getWeekId();
      querySql = `
        SELECT 
          l.player_address,
          p.nickname,
          l.points,
          l.rank,
          ROW_NUMBER() OVER (ORDER BY l.points DESC) as current_rank
        FROM leaderboard l
        JOIN players p ON p.wallet_address = l.player_address
        WHERE l.week_id = $1
        ORDER BY l.points DESC
        LIMIT $2
      `;
      params = [weekId, limit];
    } else if (period === "monthly") {
      const monthId = new Date().toISOString().slice(0, 7); // YYYY-MM
      querySql = `
        SELECT 
          p.wallet_address,
          p.nickname,
          SUM(l.points) as points,
          ROW_NUMBER() OVER (ORDER BY SUM(l.points) DESC) as rank
        FROM leaderboard l
        JOIN players p ON p.wallet_address = l.player_address
        WHERE l.week_id LIKE $1
        GROUP BY p.wallet_address, p.nickname
        ORDER BY SUM(l.points) DESC
        LIMIT $2
      `;
      params = [`${monthId}%`, limit];
    } else {
      // All-time
      querySql = `
        SELECT 
          p.wallet_address,
          p.nickname,
          p.total_points as points,
          ROW_NUMBER() OVER (ORDER BY p.total_points DESC) as rank
        FROM players p
        ORDER BY p.total_points DESC
        LIMIT $1
      `;
      params = [limit];
    }

    interface LeaderboardRow {
      rank?: number;
      player_address?: string;
      wallet_address?: string;
      nickname: string | null;
      points: string;
    }

    const result = await query<LeaderboardRow>(querySql, params);

    const leaderboard = result.rows.map((row, index: number) => ({
      rank: row.rank || index + 1,
      wallet_address: row.player_address || row.wallet_address,
      nickname: row.nickname,
      points: parseInt(row.points),
    }));

    return NextResponse.json({
      period,
      leaderboard,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
