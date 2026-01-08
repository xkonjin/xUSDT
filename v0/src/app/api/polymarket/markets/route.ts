/**
 * Polymarket Markets API Route
 *
 * Proxies requests to the FastAPI backend to fetch prediction markets
 * from Polymarket's Gamma API. Returns active markets with pricing data.
 *
 * Query Parameters:
 *   - active: boolean (default: true) - Only return active markets
 *   - limit: number (default: 50) - Max results to return
 *   - offset: number (default: 0) - Pagination offset
 *
 * Usage:
 *   GET /api/polymarket/markets?active=true&limit=50
 */

import { NextRequest, NextResponse } from "next/server";

// Backend URL for the FastAPI merchant service
// Falls back to localhost:8000 for local development
const BACKEND_URL =
  process.env.POLYMARKET_BACKEND_URL ||
  process.env.MERCHANT_URL ||
  process.env.NEXT_PUBLIC_MERCHANT_URL ||
  "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters from the incoming request
    const { searchParams } = new URL(request.url);
    const active = searchParams.get("active") ?? "true";
    const limit = searchParams.get("limit") ?? "50";
    const offset = searchParams.get("offset") ?? "0";

    // Build the backend URL with query parameters
    const backendUrl = new URL(`${BACKEND_URL.replace(/\/$/, "")}/polymarket/markets`);
    backendUrl.searchParams.set("active", active);
    backendUrl.searchParams.set("limit", limit);
    backendUrl.searchParams.set("offset", offset);

    // Fetch markets from the FastAPI backend
    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Disable caching to always get fresh market data
      cache: "no-store",
    });

    // Handle error responses from backend
    if (!response.ok) {
      const errorText = await response.text();
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = { detail: errorText || "Failed to fetch markets" };
      }
      return NextResponse.json(errorBody, { status: response.status });
    }

    // Parse and return the markets data
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Handle network or parsing errors
    console.error("Error fetching Polymarket markets:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch markets",
        hint: "Check if the backend server is running",
      },
      { status: 502 }
    );
  }
}

