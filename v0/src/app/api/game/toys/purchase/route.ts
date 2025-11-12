/**
 * Purchase Toy API Route
 * 
 * Handles toy purchase after payment verification.
 * Verifies payment via merchant service, then mints NFT toy.
 */

import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/api/db";

const MERCHANT_URL = process.env.MERCHANT_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toy_type_id, payment } = body;

    if (!toy_type_id || !payment) {
      return NextResponse.json(
        { success: false, error: "Missing toy_type_id or payment" },
        { status: 400 }
      );
    }

    // Verify payment via merchant service
    const verifyResponse = await fetch(`${MERCHANT_URL}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    });

    const paymentResult = await verifyResponse.json();

    if (paymentResult.status !== "confirmed") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment not confirmed: ${paymentResult.status}`,
        },
        { status: 400 }
      );
    }

    // Get toy type
    interface ToyRow {
      id: number;
      name: string;
      base_price_usdt0: string;
      max_mint_per_type: number;
      stat_categories: string[];
      rarity_distribution: Record<string, number>;
    }

    const toyResult = await query<ToyRow>(
      `SELECT id, name, base_price_usdt0, max_mint_per_type, stat_categories, rarity_distribution 
       FROM toys WHERE id = $1`,
      [toy_type_id]
    );

    if (toyResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Toy type ${toy_type_id} not found` },
        { status: 404 }
      );
    }

    const toy = toyResult.rows[0]!;
    const ownerAddress = payment.chosenOption.from;
    const purchasePrice = parseInt(payment.chosenOption.amount);

    // Check mint count
    const mintCountResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM nft_toys WHERE toy_type_id = $1`,
      [toy_type_id]
    );
    
    const mintCount = parseInt(mintCountResult.rows[0]?.count || "0");
    
    if (mintCount >= toy.max_mint_per_type) {
      return NextResponse.json(
        { success: false, error: `Toy type ${toy.name} has reached maximum mints` },
        { status: 400 }
      );
    }

    // Mint toy NFT (simplified - in production would call NFT contract)
    const newMintNumber = mintCount + 1;
    
    // Roll rarity
    const rarityDist = toy.rarity_distribution;
    const roll = Math.random() * 100;
    let rarity = "common";
    if (roll < rarityDist.legendary) {
      rarity = "legendary";
    } else if (roll < rarityDist.legendary + rarityDist.epic) {
      rarity = "epic";
    } else if (roll < rarityDist.legendary + rarityDist.epic + rarityDist.rare) {
      rarity = "rare";
    }

    // Generate stats based on rarity multipliers
    const rarityMultipliers: Record<string, number> = {
      common: 1.0,
      rare: 1.5,
      epic: 2.0,
      legendary: 3.0,
    };
    
    const multiplier = rarityMultipliers[rarity] || 1.0;
    const statCategories = toy.stat_categories;
    const stats: Record<string, number> = {};
    
    for (const stat of statCategories) {
      stats[stat] = Math.floor(10 * multiplier + Math.random() * 10 * multiplier);
    }

    // Generate token ID (simplified - in production would be from NFT contract)
    const tokenId = BigInt(Date.now()) * BigInt(1000) + BigInt(newMintNumber);

    // Insert NFT toy record
    await transaction(async (client) => {
      // Insert NFT
      await client.query(
        `INSERT INTO nft_toys 
         (token_id, toy_type_id, owner_address, rarity, stats_json, mint_number, original_purchase_price, minted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          tokenId.toString(),
          toy_type_id,
          ownerAddress,
          rarity,
          JSON.stringify(stats),
          newMintNumber,
          purchasePrice,
        ]
      );

      // Register or update player
      await client.query(
        `INSERT INTO players (wallet_address, credits_balance, total_points, games_played, created_at, last_active_at)
         VALUES ($1, 100, 0, 0, NOW(), NOW())
         ON CONFLICT (wallet_address) 
         DO UPDATE SET last_active_at = NOW()`,
        [ownerAddress]
      );
    });

    return NextResponse.json({
      success: true,
      token_id: tokenId.toString(),
      rarity,
      stats,
      mint_number: newMintNumber,
    });
  } catch (error) {
    console.error("Error purchasing toy:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Purchase failed" },
      { status: 500 }
    );
  }
}
