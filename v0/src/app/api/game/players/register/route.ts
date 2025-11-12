/**
 * Player Registration API Route
 * 
 * Registers a new player or updates nickname.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/api/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, nickname } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: "wallet_address is required" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Validate nickname if provided
    if (nickname) {
      if (nickname.length < 3 || nickname.length > 20) {
        return NextResponse.json(
          { error: "Nickname must be between 3 and 20 characters" },
          { status: 400 }
        );
      }

      // Check nickname uniqueness
      const existingNickname = await query(
        `SELECT wallet_address FROM players WHERE nickname = $1 AND wallet_address != $2`,
        [nickname, wallet_address]
      );

      if (existingNickname.rows.length > 0) {
        return NextResponse.json(
          { error: "Nickname already taken" },
          { status: 400 }
        );
      }
    }

    // Register or update player
    interface PlayerRow {
      wallet_address: string;
      nickname: string | null;
      credits_balance: string;
      total_points: string;
      games_played: string;
    }

    const result = await transaction<PlayerRow>(async (client) => {
      const existing = await client.query(
        `SELECT * FROM players WHERE wallet_address = $1`,
        [wallet_address]
      );

      if (existing.rows.length > 0) {
        // Update existing player
        if (nickname) {
          await client.query(
            `UPDATE players SET nickname = $1, last_active_at = NOW() WHERE wallet_address = $2`,
            [nickname, wallet_address]
          );
        } else {
          await client.query(
            `UPDATE players SET last_active_at = NOW() WHERE wallet_address = $1`,
            [wallet_address]
          );
        }

        const updated = await client.query(
          `SELECT * FROM players WHERE wallet_address = $1`,
          [wallet_address]
        );

        return updated.rows[0] as PlayerRow;
      } else {
        // Create new player
        await client.query(
          `INSERT INTO players (wallet_address, nickname, credits_balance, total_points, games_played, created_at, last_active_at)
           VALUES ($1, $2, 100, 0, 0, NOW(), NOW())`,
          [wallet_address, nickname || null]
        );

        const created = await client.query(
          `SELECT * FROM players WHERE wallet_address = $1`,
          [wallet_address]
        );

        return created.rows[0] as PlayerRow;
      }
    });

    return NextResponse.json({
      wallet_address: result.wallet_address,
      nickname: result.nickname,
      credits_balance: parseInt(result.credits_balance),
      total_points: parseInt(result.total_points),
      games_played: parseInt(result.games_played),
    });
  } catch (error) {
    console.error("Error registering player:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}
