/**
 * Equip Toy API Route
 * 
 * Equips a toy to a specific inventory slot (1-3).
 */

import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/api/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const walletAddress = address;
    const body = await request.json();
    const { token_id, slot_number } = body;

    if (!token_id || !slot_number) {
      return NextResponse.json(
        { error: "token_id and slot_number are required" },
        { status: 400 }
      );
    }

    if (slot_number < 1 || slot_number > 3) {
      return NextResponse.json(
        { error: "slot_number must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    await transaction(async (client) => {
      // Verify toy ownership
      const ownership = await client.query(
        `SELECT owner_address FROM nft_toys WHERE token_id = $1`,
        [token_id]
      );

      if (ownership.rows.length === 0) {
        throw new Error("Toy not found");
      }

      const ownerRow = ownership.rows[0] as { owner_address: string };
      if (ownerRow.owner_address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Toy not owned by player");
      }

      // Remove toy from any existing slot
      await client.query(
        `DELETE FROM player_inventory WHERE token_id = $1 AND player_address = $2`,
        [token_id, walletAddress]
      );

      // Remove any toy from the target slot
      await client.query(
        `DELETE FROM player_inventory WHERE player_address = $1 AND slot_number = $2`,
        [walletAddress, slot_number]
      );

      // Equip toy to slot
      await client.query(
        `INSERT INTO player_inventory (player_address, token_id, slot_number, equipped_at)
         VALUES ($1, $2, $3, NOW())`,
        [walletAddress, token_id, slot_number]
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error equipping toy:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to equip toy" },
      { status: 500 }
    );
  }
}
