/**
 * Unequip Toy API Route
 * 
 * Unequips a toy from inventory.
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
    const { token_id } = body;

    if (!token_id) {
      return NextResponse.json(
        { error: "token_id is required" },
        { status: 400 }
      );
    }

    await transaction(async (client) => {
      // Verify ownership
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

      // Remove from inventory
      await client.query(
        `DELETE FROM player_inventory WHERE token_id = $1 AND player_address = $2`,
        [token_id, walletAddress]
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unequipping toy:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unequip toy" },
      { status: 500 }
    );
  }
}
