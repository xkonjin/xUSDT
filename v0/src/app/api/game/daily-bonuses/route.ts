/**
 * Daily Bonuses API Route
 * 
 * Gets current day's daily bonuses for toy types.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/api/db";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const result = await query<{
      toy_type_id: number;
      toy_name: string;
      icon_name: string;
      multiplier: string;
      bonus_date: string;
      game_types: string;
    }>(
      `SELECT 
         db.toy_type_id,
         t.name as toy_name,
         t.icon_name,
         db.multiplier,
         db.bonus_date,
         db.game_types
       FROM daily_bonuses db
       JOIN toys t ON t.id = db.toy_type_id
       WHERE db.bonus_date = $1
       ORDER BY db.multiplier DESC`,
      [today]
    );

    const bonuses = result.rows.map((row) => ({
      toy_type_id: row.toy_type_id,
      toy_name: row.toy_name,
      icon_name: row.icon_name,
      multiplier: parseFloat(row.multiplier),
      bonus_date: row.bonus_date,
      game_types: row.game_types ? JSON.parse(row.game_types) : [],
    }));

    return NextResponse.json({
      date: today,
      bonuses,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch daily bonuses";
    console.error("Error fetching daily bonuses:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
