/**
 * Player Profile API Route
 * 
 * Gets player information by wallet address.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/api/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const walletAddress = address;

    interface PlayerRow {
      wallet_address: string;
      nickname: string | null;
      credits_balance: string;
      total_points: string;
      games_played: string;
    }

    const result = await query<PlayerRow>(
      `SELECT wallet_address, nickname, credits_balance, total_points, games_played
       FROM players WHERE wallet_address = $1`,
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    const player = result.rows[0]!;

    return NextResponse.json({
      wallet_address: player.wallet_address,
      nickname: player.nickname,
      credits_balance: parseInt(player.credits_balance),
      total_points: parseInt(player.total_points),
      games_played: parseInt(player.games_played),
    });
  } catch (error) {
    console.error("Error fetching player:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch player" },
      { status: 500 }
    );
  }
}
