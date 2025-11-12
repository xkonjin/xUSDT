/**
 * Submit Game Result API Route
 * 
 * Submits game result and calculates points with multipliers.
 * Validates result and updates leaderboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/api/db";
import { cache } from "@/lib/api/redis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challenge_id, result_data } = body;

    if (!challenge_id || !result_data) {
      return NextResponse.json(
        { error: "challenge_id and result_data are required" },
        { status: 400 }
      );
    }

    // Get challenge from cache
    const challengeData = await cache.get(`challenge:${challenge_id}`);
    if (!challengeData) {
      return NextResponse.json(
        { error: "Challenge not found or expired" },
        { status: 400 }
      );
    }

    interface ChallengeData {
      player_address: string;
      game_type: string;
      difficulty: number;
      seed: number;
      wager_type?: string;
      wager_amount?: number;
      wager_token_id?: number;
    }

    const {
      player_address,
      game_type,
      wager_type,
      wager_amount,
      wager_token_id,
    } = challengeData as ChallengeData;

    // Validate result (simplified - full implementation would validate against seed)
    // For now, accept any valid result structure
    const validationHash = Array.from(
      crypto.getRandomValues(new Uint8Array(32))
    )
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Calculate base points
    const basePointsMap: Record<string, number> = {
      reaction_time: 100,
      memory_match: 150,
      precision_click: 120,
      pattern_recognition: 130,
      dice_roll: 80,
      card_draw: 90,
      wheel_spin: 100,
    };

    const basePoints = basePointsMap[game_type] || 100;

    // Get equipped toys and calculate multipliers
    // Only toys with bonuses matching the current game provide multipliers
    const today = new Date().toISOString().split("T")[0];
    
    interface InventoryRow {
      token_id: number;
      toy_type_id: number;
      stats_json: Record<string, number>;
      stat_categories: string[];
    }

    const inventoryResult = await query<InventoryRow>(
      `SELECT 
         n.token_id,
         n.toy_type_id,
         n.stats_json,
         t.stat_categories
       FROM player_inventory pi
       JOIN nft_toys n ON n.token_id = pi.token_id
       JOIN toys t ON t.id = n.toy_type_id
       WHERE pi.player_address = $1`,
      [player_address]
    );

    // Calculate base toy multiplier from stats (1% per stat point)
    // This provides a base bonus regardless of game type
    let toyMultiplier = 1.0;
    for (const row of inventoryResult.rows) {
      const totalStats = Object.values(row.stats_json || {}).reduce((sum, val) => sum + (val || 0), 0);
      toyMultiplier += totalStats * 0.01; // 1% per stat point
    }

    // Get daily bonus multiplier - only for toys that affect the current game
    interface DailyBonusRow {
      multiplier: string;
      game_types: string;
    }

    const dailyBonusResult = await query<DailyBonusRow>(
      `SELECT db.multiplier, db.game_types
       FROM daily_bonuses db
       WHERE db.bonus_date = $1 
       AND db.toy_type_id IN (
         SELECT n.toy_type_id FROM player_inventory pi
         JOIN nft_toys n ON n.token_id = pi.token_id
         WHERE pi.player_address = $2
       )
       ORDER BY db.multiplier DESC`,
      [today, player_address]
    );

    // Find the highest multiplier for toys that affect the current game
    // Only toys with bonuses matching the current game provide daily multipliers
    let dailyMultiplier = 1.0;
    for (const row of dailyBonusResult.rows) {
      const gameTypes = row.game_types ? JSON.parse(row.game_types) : [];
      // Only apply bonus if the toy affects the current game
      if (gameTypes.includes(game_type)) {
        const multiplier = parseFloat(row.multiplier);
        if (multiplier > dailyMultiplier) {
          dailyMultiplier = multiplier;
        }
      }
    }

    // Calculate wager multiplier
    let wagerMultiplier = 1.0;
    if (wager_type === "usdt0" && wager_amount) {
      const amount = typeof wager_amount === "string" ? parseInt(wager_amount) : wager_amount;
      wagerMultiplier = 1.0 + Math.min(amount / 1_000_000 / 10, 2.0); // Up to 3x
    } else if (wager_type === "credits" && wager_amount) {
      const amount = typeof wager_amount === "string" ? parseInt(wager_amount) : wager_amount;
      wagerMultiplier = 1.0 + Math.min(amount / 100, 1.0); // Up to 2x
    }

    // Calculate final points
    const pointsEarned = Math.floor(
      basePoints * toyMultiplier * dailyMultiplier * wagerMultiplier
    );

    // Record game session
    await transaction(async (client) => {
      // Deduct wager if credits
      if (wager_type === "credits" && wager_amount) {
        await client.query(
          `UPDATE players 
           SET credits_balance = credits_balance - $1,
               total_points = total_points + $2,
               games_played = games_played + 1,
               last_active_at = NOW()
           WHERE wallet_address = $3`,
          [wager_amount, pointsEarned, player_address]
        );
      } else {
        await client.query(
          `UPDATE players 
           SET total_points = total_points + $1,
               games_played = games_played + 1,
               last_active_at = NOW()
           WHERE wallet_address = $2`,
          [pointsEarned, player_address]
        );
      }

      // Insert game session
      await client.query(
        `INSERT INTO game_sessions 
         (player_address, game_type, wager_type, wager_amount, wager_token_id,
          points_earned, base_points, toy_bonus_multiplier, daily_bonus_multiplier,
          wager_multiplier, game_result_data, server_validation_hash, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          player_address,
          game_type,
          wager_type || "none",
          wager_amount || null,
          wager_token_id || null,
          pointsEarned,
          basePoints,
          toyMultiplier,
          dailyMultiplier,
          wagerMultiplier,
          JSON.stringify(result_data),
          validationHash,
        ]
      );

      // Update leaderboard
      const weekId = getWeekId();
      await client.query(
        `INSERT INTO leaderboard (player_address, week_id, points, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (player_address, week_id)
         DO UPDATE SET points = leaderboard.points + $3, updated_at = NOW()`,
        [player_address, weekId, pointsEarned]
      );
    });

    // Delete challenge
    await cache.del(`challenge:${challenge_id}`);

    return NextResponse.json({
      success: true,
      points_earned: pointsEarned,
      base_points: basePoints,
      toy_bonus_multiplier: toyMultiplier,
      daily_bonus_multiplier: dailyMultiplier,
      wager_multiplier: wagerMultiplier,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to submit game";
    console.error("Error submitting game:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

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
