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
import { proxyGet, isValidWalletAddress } from "../../../../lib/api-helpers";

export async function GET(request: NextRequest) {
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
  if (!isValidWalletAddress(userAddress)) {
    return NextResponse.json(
      { error: "Invalid wallet address format" },
      { status: 400 }
    );
  }

  // Build params for backend
  const params = new URLSearchParams();
  params.set("user_address", userAddress);
  params.set("limit", limit);
  if (status) {
    params.set("status", status);
  }

  return proxyGet("/polymarket/predictions", params);
}
