/**
 * Player Inventory API Route
 * 
 * Gets player's inventory with equipped toys in 3 slots.
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

    // Get equipped toys by slot
    interface EquippedRow {
      slot_number: number;
      token_id: string;
      toy_type_id: number;
      rarity: string;
      stats_json: Record<string, number>;
      mint_number: string;
      toy_name: string;
    }

    const equippedResult = await query<EquippedRow>(
      `SELECT 
         pi.slot_number,
         pi.token_id,
         n.toy_type_id,
         n.rarity,
         n.stats_json,
         n.mint_number,
         t.name as toy_name
       FROM player_inventory pi
       JOIN nft_toys n ON n.token_id = pi.token_id
       JOIN toys t ON t.id = n.toy_type_id
       WHERE pi.player_address = $1
       ORDER BY pi.slot_number`,
      [walletAddress]
    );

    interface EquippedToy {
      token_id: number;
      toy_type_id: number;
      toy_name: string;
      rarity: string;
      stats: Record<string, number>;
      mint_number: number;
    }

    const equipped: Record<number, EquippedToy | null> = { 1: null, 2: null, 3: null };

    for (const row of equippedResult.rows) {
      equipped[row.slot_number] = {
        token_id: parseInt(row.token_id),
        toy_type_id: row.toy_type_id,
        toy_name: row.toy_name,
        rarity: row.rarity,
        stats: row.stats_json,
        mint_number: parseInt(row.mint_number),
      };
    }

    // Get all owned toys
    interface OwnedRow {
      token_id: string;
      toy_type_id: number;
      toy_name: string;
      rarity: string;
      stats_json: Record<string, number>;
      mint_number: string;
      is_equipped: boolean;
    }

    const ownedResult = await query<OwnedRow>(
      `SELECT 
         n.token_id,
         n.toy_type_id,
         n.rarity,
         n.stats_json,
         n.mint_number,
         t.name as toy_name,
         CASE WHEN pi.id IS NOT NULL THEN true ELSE false END as is_equipped
       FROM nft_toys n
       JOIN toys t ON t.id = n.toy_type_id
       LEFT JOIN player_inventory pi ON pi.token_id = n.token_id AND pi.player_address = $1
       WHERE n.owner_address = $1
       ORDER BY n.minted_at DESC`,
      [walletAddress]
    );

    const owned = ownedResult.rows.map((row) => ({
      token_id: parseInt(row.token_id),
      toy_type_id: row.toy_type_id,
      toy_name: row.toy_name,
      rarity: row.rarity,
      stats: row.stats_json,
      mint_number: parseInt(row.mint_number),
      is_equipped: row.is_equipped,
    }));

    return NextResponse.json({
      equipped,
      owned,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
