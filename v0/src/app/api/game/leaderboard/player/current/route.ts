/**
 * Current Player Leaderboard Rank API Route
 * 
 * Returns the current player's leaderboard rank.
 */

import { NextRequest, NextResponse } from "next/server";

const GAME_API_URL = process.env.GAME_API_URL || "http://127.0.0.1:8001";

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from headers (set by middleware or client)
    const walletAddress = request.headers.get("x-wallet-address");
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${GAME_API_URL}/leaderboard/player/${walletAddress}`, {
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch leaderboard rank";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

