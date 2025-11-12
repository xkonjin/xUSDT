import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

/**
 * Get user's USDC balance
 * 
 * Returns current balance, pending deposits, and deposit history.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/polymarket/balance?user_address=${userAddress}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || "Failed to fetch balance" }, { status: response.status });
    }

    const balance = await response.json();
    return NextResponse.json(balance);
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch balance" }, { status: 500 });
  }
}

