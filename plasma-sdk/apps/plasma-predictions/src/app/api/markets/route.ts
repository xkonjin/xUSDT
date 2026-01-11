import { NextRequest, NextResponse } from "next/server";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const limit = searchParams.get("limit") || "100";

    // Build Polymarket Gamma API URL
    let apiUrl = `${GAMMA_API_URL}/markets?closed=false&active=true&limit=${limit}`;
    if (slug) {
      apiUrl = `${GAMMA_API_URL}/markets?slug=${encodeURIComponent(slug)}&limit=1`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Return with CORS headers
    return NextResponse.json(data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Markets API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets", markets: [] },
      { status: 500 }
    );
  }
}
