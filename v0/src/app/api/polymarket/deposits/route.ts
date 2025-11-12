import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

/**
 * Get user's deposit history
 * 
 * Returns list of deposits with conversion status.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit") || "100";

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    const url = new URL(`${BACKEND_URL}/polymarket/deposits`);
    url.searchParams.append("user_address", userAddress);
    if (status) {
      url.searchParams.append("status", status);
    }
    url.searchParams.append("limit", limit);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || "Failed to fetch deposits" }, { status: response.status });
    }

    const deposits = await response.json();
    return NextResponse.json(deposits);
  } catch (error) {
    console.error("Error fetching deposits:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch deposits" }, { status: 500 });
  }
}

