/**
 * Weekly Prizes Cron Job
 * 
 * Runs every Friday to calculate and distribute weekly prizes.
 * Vercel cron: 0 0 * * 5 (Fridays at midnight UTC)
 */

import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/api/db";

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

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lastWeekId = getWeekId(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    // Get top 3 players from last week
    const leaderboardResult = await query<{
      player_address: string;
      points: string;
      rank: string;
    }>(
      `SELECT player_address, points, ROW_NUMBER() OVER (ORDER BY points DESC) as rank
       FROM leaderboard
       WHERE week_id = $1
       ORDER BY points DESC
       LIMIT 3`,
      [lastWeekId]
    );

    if (leaderboardResult.rows.length === 0) {
      return NextResponse.json({ message: "No players for last week" });
    }

    // Calculate total merchant fees (simplified - in production would sum from marketplace_sales)
    const feesResult = await query<{ total_fees: string }>(
      `SELECT COALESCE(SUM(merchant_fee_usdt0), 0) as total_fees
       FROM marketplace_sales
       WHERE sold_at >= NOW() - INTERVAL '7 days'`
    );

    const totalFees = BigInt(feesResult.rows[0]?.total_fees || 0);
    const prizePool = totalFees / BigInt(2); // 50% of fees

    // Distribute prizes: 50%, 30%, 20%
    const prizeDistribution = [0.5, 0.3, 0.2];
    const prizes = leaderboardResult.rows.map((row, index: number) => ({
      player_address: row.player_address,
      rank: parseInt(row.rank),
      prize_amount: (prizePool * BigInt(Math.floor(prizeDistribution[index]! * 100))) / BigInt(100),
    }));

    // Record prizes (in production would also send USDT0 to wallets)
    await transaction(async (client) => {
      for (const prize of prizes) {
        await client.query(
          `INSERT INTO weekly_prizes (player_address, week_id, rank, prize_amount_usdt0, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [prize.player_address, lastWeekId, prize.rank, prize.prize_amount.toString()]
        );
      }
    });

    return NextResponse.json({
      success: true,
      week_id: lastWeekId,
      prizes_distributed: prizes.length,
      total_prize_pool: prizePool.toString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to distribute prizes";
    console.error("Error distributing weekly prizes:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
