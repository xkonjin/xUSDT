/**
 * Polymarket Predictions API Route
 *
 * Proxies requests to the FastAPI backend to fetch a user's prediction history.
 *
 * Query Parameters:
 *   - user_address: string (required) - User's wallet address
 *   - limit: number (default: 50) - Max results to return
 *   - status: string (optional) - Filter by status (active, won, lost)
 *
 * Usage:
 *   GET /api/polymarket/predictions?user_address=0x123...&limit=50
 */

import { NextRequest, NextResponse } from "next/server";

// Backend URL for the FastAPI merchant service
const BACKEND_URL =
  process.env.POLYMARKET_BACKEND_URL ||
  process.env.MERCHANT_URL ||
  process.env.NEXT_PUBLIC_MERCHANT_URL ||
  "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("user_address");
    const limit = searchParams.get("limit") ?? "50";
    const status = searchParams.get("status");

    // Validate required user_address
    if (!userAddress) {
      return NextResponse.json(
        { error: "user_address query parameter is required" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!userAddress.startsWith("0x")) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Build the backend URL with query parameters
    const backendUrl = new URL(`${BACKEND_URL.replace(/\/$/, "")}/polymarket/predictions`);
    backendUrl.searchParams.set("user_address", userAddress);
    backendUrl.searchParams.set("limit", limit);
    if (status) {
      backendUrl.searchParams.set("status", status);
    }

    // Fetch predictions from the FastAPI backend
    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorBody: unknown;
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = { detail: errorText || "Failed to fetch predictions" };
      }
      return NextResponse.json(errorBody, { status: response.status });
    }

    // Parse and return the predictions data
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch predictions",
        hint: "Check if the backend server is running",
      },
      { status: 502 }
    );
  }
}

