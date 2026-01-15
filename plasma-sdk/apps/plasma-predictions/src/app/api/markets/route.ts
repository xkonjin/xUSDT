import { NextRequest, NextResponse } from "next/server";
import { 
  getMarkets, 
  searchMarkets,
  type PolymarketMarket 
} from "@/lib/polymarket";

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || searchParams.get("q") || "";
    const slug = searchParams.get("slug");
    const active = searchParams.get("active") !== "false";
    const closed = searchParams.get("closed") === "true";

    let markets: PolymarketMarket[];

    // If searching by slug, fetch specific market
    if (slug) {
      const params = new URLSearchParams({
        slug,
        limit: '1',
      });
      
      const response = await fetch(`${POLYMARKET_API}/markets?${params}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }
      
      markets = await response.json();
    }
    // If there's a search query, use search function
    else if (search) {
      markets = await searchMarkets(search, limit);
    }
    // Otherwise fetch paginated markets
    else {
      markets = await getMarkets(limit, offset, active, closed);
    }

    return NextResponse.json(markets, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error("Failed to fetch markets from Polymarket:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
