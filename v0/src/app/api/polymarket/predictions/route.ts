/**
 * Polymarket Predictions API Route
 * 
 * Gets user's predictions/bets.
 */

import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_API_URL = process.env.POLYMARKET_API_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get("user_address");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit") ?? "100";
    const offset = searchParams.get("offset") ?? "0";

    if (!userAddress) {
      return NextResponse.json(
        { error: "user_address is required" },
        { status: 400 }
      );
    }

    const url = new URL(`${POLYMARKET_API_URL}/predictions`);
    url.searchParams.set("user_address", userAddress);
    url.searchParams.set("limit", limit);
    url.searchParams.set("offset", offset);
    if (status) {
      url.searchParams.set("status", status);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to fetch predictions" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch predictions" },
      { status: 500 }
    );
  }
}

