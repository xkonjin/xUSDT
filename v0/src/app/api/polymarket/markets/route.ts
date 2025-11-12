/**
 * Polymarket Markets API Route
 * 
 * Proxies requests to FastAPI backend for Polymarket market data.
 * Fetches active markets from Polymarket API.
 */

import { NextRequest, NextResponse } from "next/server";

const POLYMARKET_API_URL = process.env.POLYMARKET_API_URL || "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const active = searchParams.get("active") ?? "true";
    const limit = searchParams.get("limit") ?? "100";
    const offset = searchParams.get("offset") ?? "0";

    const url = new URL(`${POLYMARKET_API_URL}/markets`);
    url.searchParams.set("active", active);
    url.searchParams.set("limit", limit);
    url.searchParams.set("offset", offset);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to fetch markets" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Polymarket markets:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

