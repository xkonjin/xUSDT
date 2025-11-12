/**
 * Start Game API Route
 * 
 * Starts a new game session and returns challenge data.
 * For now, proxies to game service or returns simplified challenge.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/api/db";
import { cache } from "@/lib/api/redis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_address, game_type, difficulty = 1, wager_type, wager_amount, wager_token_id } = body;

    if (!player_address || !game_type) {
      return NextResponse.json(
        { error: "player_address and game_type are required" },
        { status: 400 }
      );
    }

    // Verify player exists
    const playerResult = await query<{ credits_balance: string }>(
      `SELECT credits_balance FROM players WHERE wallet_address = $1`,
      [player_address]
    );

    if (playerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Player not found. Please register first." },
        { status: 404 }
      );
    }

    // Validate wager
    if (wager_type === "credits") {
      const credits = parseInt(playerResult.rows[0]!.credits_balance);
      if (credits < (wager_amount || 0)) {
        return NextResponse.json(
          { error: "Insufficient credits" },
          { status: 400 }
        );
      }
    }

    // Generate challenge ID
    const challengeId = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Generate seed for game
    const seed = Math.floor(Math.random() * 1000000);
    const expiresAt = Date.now() + 300000; // 5 minutes

    // Store challenge in cache
    await cache.set(
      `challenge:${challengeId}`,
      {
        player_address,
        game_type,
        difficulty,
        seed,
        wager_type,
        wager_amount,
        wager_token_id,
        created_at: Date.now(),
        expires_at: expiresAt,
      },
      300 // 5 minutes TTL
    );

    // Return challenge (simplified - full implementation would include expected results)
    return NextResponse.json({
      challenge_id: challengeId,
      game_type,
      difficulty,
      seed,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Error starting game:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start game" },
      { status: 500 }
    );
  }
}
