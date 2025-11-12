/**
 * Toys API Route
 * 
 * Lists all available toy types with current mint counts.
 * Replaces FastAPI /toys endpoint.
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/api/db";

export async function GET() {
  try {
    // Get all toys with mint counts
    interface ToyRow {
      id: number;
      name: string;
      description: string;
      base_price_usdt0: string;
      icon_name: string;
      stat_categories: string[];
      rarity_distribution: Record<string, number>;
      max_mint_per_type: number;
      current_mint_count: string;
    }

    const toysResult = await query<ToyRow>(`
      SELECT 
        t.id,
        t.name,
        t.description,
        t.base_price_usdt0,
        t.icon_name,
        t.stat_categories,
        t.rarity_distribution,
        t.max_mint_per_type,
        COALESCE(COUNT(n.token_id), 0) as current_mint_count
      FROM toys t
      LEFT JOIN nft_toys n ON n.toy_type_id = t.id
      GROUP BY t.id
      ORDER BY t.id
    `);

    const toys = toysResult.rows.map((toy) => ({
      id: toy.id,
      name: toy.name,
      description: toy.description,
      base_price_usdt0: Number(toy.base_price_usdt0),
      price_usdt0: Number(toy.base_price_usdt0) / 1_000_000,
      icon_name: toy.icon_name,
      stat_categories: toy.stat_categories,
      rarity_distribution: toy.rarity_distribution,
      current_mint_count: Number(toy.current_mint_count),
      max_mint_per_type: toy.max_mint_per_type,
      available: Number(toy.current_mint_count) < toy.max_mint_per_type,
    }));

    return NextResponse.json(toys);
  } catch (error) {
    console.error("Error fetching toys:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch toys" },
      { status: 500 }
    );
  }
}
