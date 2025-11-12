/**
 * Daily Bonuses Cron Job
 * 
 * Runs daily to generate new daily bonuses for toy types and games of the day.
 * 
 * Process:
 * 1. Selects 2 random games as "games of the day"
 * 2. Selects 3-5 random toy types and assigns bonuses tied to specific games
 * 3. Only toys with bonuses matching the games of the day provide multipliers
 * 
 * Vercel cron: 0 0 * * * (daily at midnight UTC)
 */

import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/api/db";

const AVAILABLE_GAMES = [
  "reaction_time",
  "memory_match",
  "precision_click",
  "pattern_recognition",
  "dice_roll",
  "card_draw",
  "wheel_spin",
];

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // Check if bonuses already exist for today
    const existing = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM daily_bonuses WHERE bonus_date = $1`,
      [today]
    );

    if (existing.rows[0] && parseInt(existing.rows[0].count) > 0) {
      return NextResponse.json({ message: "Daily bonuses already generated for today" });
    }

    await transaction(async (client) => {
      // Step 1: Select 2 random games as "games of the day"
      const shuffled = [...AVAILABLE_GAMES].sort(() => Math.random() - 0.5);
      const gamesOfDay = shuffled.slice(0, 2);

      // Delete existing games of the day for today
      await client.query(`DELETE FROM games_of_the_day WHERE date = $1`, [today]);

      // Insert games of the day
      await client.query(
        `INSERT INTO games_of_the_day (date, game_type_1, game_type_2, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [today, gamesOfDay[0], gamesOfDay[1]]
      );

      // Step 2: Get all toy types
      const toysResult = await query<{ id: number }>(`SELECT id FROM toys ORDER BY RANDOM()`);
      const featuredToys = toysResult.rows.slice(0, 5); // Select up to 5 toys

      // Step 3: Delete existing bonuses for today
      await client.query(`DELETE FROM daily_bonuses WHERE bonus_date = $1`, [today]);

      // Step 4: Create bonuses with game-specific assignments
      const toysForGame1 = featuredToys.slice(0, 2);
      const toysForGame2 = featuredToys.slice(2, 4);
      const remainingToys = featuredToys.slice(4);

      // Assign bonuses for game 1 toys
      for (let i = 0; i < toysForGame1.length; i++) {
        const toy = toysForGame1[i];
        const multiplier = i === 0 ? (Math.random() < 0.5 ? 2.5 : 3.0) : (Math.random() < 0.5 ? 2.0 : 2.5);
        const bonusType = "points";

        await client.query(
          `INSERT INTO daily_bonuses (toy_type_id, bonus_date, multiplier, bonus_type, game_types, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [toy.id, today, multiplier.toFixed(2), bonusType, JSON.stringify([gamesOfDay[0]])]
        );
      }

      // Assign bonuses for game 2 toys
      for (let i = 0; i < toysForGame2.length; i++) {
        const toy = toysForGame2[i];
        const multiplier = i === 0 ? (Math.random() < 0.5 ? 2.5 : 3.0) : (Math.random() < 0.5 ? 2.0 : 2.5);
        const bonusType = "points";

        await client.query(
          `INSERT INTO daily_bonuses (toy_type_id, bonus_date, multiplier, bonus_type, game_types, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [toy.id, today, multiplier.toFixed(2), bonusType, JSON.stringify([gamesOfDay[1]])]
        );
      }

      // Assign bonuses for remaining toys (can affect both games or one)
      for (const toy of remainingToys) {
        const multiplier = Math.random() < 0.5 ? 1.5 : 2.0;
        const bonusType = "points";
        
        // 30% chance to affect both games, otherwise random game
        const affectsBoth = Math.random() < 0.3;
        const gameTypes = affectsBoth ? gamesOfDay : [gamesOfDay[Math.floor(Math.random() * 2)]];

        await client.query(
          `INSERT INTO daily_bonuses (toy_type_id, bonus_date, multiplier, bonus_type, game_types, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [toy.id, today, multiplier.toFixed(2), bonusType, JSON.stringify(gameTypes)]
        );
      }
    });

    return NextResponse.json({
      success: true,
      date: today,
      message: "Daily bonuses and games of the day generated successfully",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate daily bonuses";
    console.error("Error generating daily bonuses:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
