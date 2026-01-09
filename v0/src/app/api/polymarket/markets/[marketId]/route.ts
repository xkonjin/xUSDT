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
import { proxyGet, errorResponse } from "../../../../../lib/api-helpers";

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

    // Validate market ID format - whitelist approach is safer than encoding
    // Only allow alphanumeric characters, hyphens, and underscores
    // This prevents path traversal and URL injection attacks
    const MARKET_ID_REGEX = /^[A-Za-z0-9_-]+$/;
    if (!MARKET_ID_REGEX.test(marketId)) {
      return NextResponse.json(
        { error: "Invalid market ID format - only alphanumeric, hyphens, and underscores allowed" },
        { status: 400 }
      );
    }

    // marketId is now validated, no encoding needed
    return proxyGet(`/polymarket/markets/${marketId}`);
  } catch (error) {
    console.error("Error in market detail route:", error);
    return errorResponse(error, 500);
  }
}
