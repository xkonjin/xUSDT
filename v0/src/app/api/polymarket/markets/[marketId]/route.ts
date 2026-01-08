/**
 * Polymarket Single Market API Route
 *
 * Proxies requests to the FastAPI backend to fetch a single market's
 * details from Polymarket's Gamma API.
 *
 * Path Parameters:
 *   - marketId: string - The market's condition_id
 *
 * Usage:
 *   GET /api/polymarket/markets/0x123abc...
 */

import { NextRequest, NextResponse } from "next/server";

// Backend URL for the FastAPI merchant service
const BACKEND_URL =
  process.env.POLYMARKET_BACKEND_URL ||
  process.env.MERCHANT_URL ||
  process.env.NEXT_PUBLIC_MERCHANT_URL ||
  "http://127.0.0.1:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  try {
    // Extract the marketId from the route params
    const { marketId } = await params;

    if (!marketId) {
      return NextResponse.json(
        { error: "Market ID is required" },
        { status: 400 }
      );
    }

    // Build the backend URL for the single market endpoint
    const backendUrl = `${BACKEND_URL.replace(/\/$/, "")}/polymarket/markets/${encodeURIComponent(marketId)}`;

    // Fetch market details from the FastAPI backend
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    // Handle 404 - market not found
    if (response.status === 404) {
      return NextResponse.json(
        { error: "Market not found", marketId },
        { status: 404 }
      );
    }

    // Handle other error responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = { detail: errorText || "Failed to fetch market" };
      }
      return NextResponse.json(errorBody, { status: response.status });
    }

    // Parse and return the market data
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Polymarket market:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch market",
        hint: "Check if the backend server is running",
      },
      { status: 502 }
    );
  }
}

