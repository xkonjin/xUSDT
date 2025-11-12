/**
 * Games of the Day API Route
 * 
 * Gets today's featured games and which toys provide bonuses for them.
 * This helps players understand which toys to equip in their squad.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/api/db";

const GAME_NAMES: Record<string, string> = {
  reaction_time: "Reaction Time",
  memory_match: "Memory Match",
  precision_click: "Precision Click",
  pattern_recognition: "Pattern Recognition",
  dice_roll: "Dice Roll",
  card_draw: "Card Draw",
  wheel_spin: "Wheel Spin",
};

const GAME_ICONS: Record<string, string> = {
  reaction_time: "⚡",
  memory_match: "🧠",
  precision_click: "🎯",
  pattern_recognition: "🔍",
  dice_roll: "🎲",
  card_draw: "🃏",
  wheel_spin: "🎡",
};

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get games of the day
    const gamesResult = await query<{
      game_type_1: string;
      game_type_2: string;
    }>(
      `SELECT game_type_1, game_type_2 
       FROM games_of_the_day 
       WHERE date = $1`,
      [today]
    );

    if (gamesResult.rows.length === 0) {
      // If no games of the day set, return empty (cron hasn't run yet)
      return NextResponse.json({
        date: today,
        games_of_the_day: [],
        toy_bonuses: [],
        message: "Games of the day not yet set. Check back later!",
      });
    }

    const { game_type_1, game_type_2 } = gamesResult.rows[0];
    const gamesOfDay = [game_type_1, game_type_2];

    // Get toy bonuses for today that match the games of the day
    const bonusesResult = await query<{
      toy_type_id: number;
      toy_name: string;
      icon_name: string;
      multiplier: string;
      game_types: string;
    }>(
      `SELECT 
         db.toy_type_id,
         t.name as toy_name,
         t.icon_name,
         db.multiplier,
         db.game_types
       FROM daily_bonuses db
       JOIN toys t ON t.id = db.toy_type_id
       WHERE db.bonus_date = $1
       ORDER BY db.multiplier DESC`,
      [today]
    );

    const toyBonuses = bonusesResult.rows.map((row) => {
      const gameTypes = row.game_types ? JSON.parse(row.game_types) : [];
      return {
        toy_type_id: row.toy_type_id,
        toy_name: row.toy_name,
        icon_name: row.icon_name,
        multiplier: parseFloat(row.multiplier),
        game_types: gameTypes,
        affects_games_of_day: gameTypes.some((gt: string) => gamesOfDay.includes(gt)),
      };
    });

    return NextResponse.json({
      date: today,
      games_of_the_day: gamesOfDay.map((gameType) => ({
        id: gameType,
        name: GAME_NAMES[gameType] || gameType,
        icon: GAME_ICONS[gameType] || "🎮",
      })),
      toy_bonuses: toyBonuses.filter((b) => b.affects_games_of_day),
      all_toy_bonuses: toyBonuses,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch games of the day";
    console.error("Error fetching games of the day:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

