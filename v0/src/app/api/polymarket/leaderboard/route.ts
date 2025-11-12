/**
 * Polymarket Leaderboard API Route
 * 
 * Gets prediction leaderboard rankings.
 */

import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_API_URL = process.env.POLYMARKET_API_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") ?? "alltime";
    const limit = searchParams.get("limit") ?? "100";
    const offset = searchParams.get("offset") ?? "0";

    const url = new URL(`${POLYMARKET_API_URL}/leaderboard`);
    url.searchParams.set("period", period);
    url.searchParams.set("limit", limit);
    url.searchParams.set("offset", offset);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to fetch leaderboard" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

