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

    // Sanitize market ID - only allow alphanumeric, hyphens, and underscores
    // This prevents path traversal and URL injection attacks
    const sanitizedId = encodeURIComponent(marketId);

    return proxyGet(`/polymarket/markets/${sanitizedId}`);
  } catch (error) {
    console.error("Error in market detail route:", error);
    return errorResponse(error, 500);
  }
}
