/**
 * Marketplace Listings API Route
 * 
 * Returns all active marketplace listings.
 */

import { NextResponse } from "next/server";

const GAME_API_URL = process.env.GAME_API_URL || "http://127.0.0.1:8001";

export async function GET() {
  try {
    const response = await fetch(`${GAME_API_URL}/marketplace/listings`, {
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

