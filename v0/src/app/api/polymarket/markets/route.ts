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

import { NextRequest } from "next/server";
import { proxyGet } from "../../../../lib/api-helpers";

export async function GET(request: NextRequest) {
  // Extract and forward query parameters
  const { searchParams } = new URL(request.url);

  // Build params with defaults
  const params = new URLSearchParams();
  params.set("active", searchParams.get("active") ?? "true");
  params.set("limit", searchParams.get("limit") ?? "50");
  params.set("offset", searchParams.get("offset") ?? "0");

  return proxyGet("/polymarket/markets", params);
}
