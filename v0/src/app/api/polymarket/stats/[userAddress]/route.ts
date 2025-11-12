/**
 * Polymarket User Stats API Route
 * 
 * Gets prediction statistics for a user.
 */

import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_API_URL = process.env.POLYMARKET_API_URL || "http://127.0.0.1:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: { userAddress: string } }
) {
  try {
    const { userAddress } = params;

    const response = await fetch(`${POLYMARKET_API_URL}/stats/${userAddress}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to fetch stats" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

