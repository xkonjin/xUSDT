import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

/**
 * Create or update user profile
 * 
 * Sets display name and profile information.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/polymarket/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || "Failed to update profile" }, { status: response.status });
    }

    const profile = await response.json();
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update profile" }, { status: 500 });
  }
}

/**
 * Get user profile
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/polymarket/profile/${walletAddress}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || "Failed to fetch profile" }, { status: response.status });
    }

    const profile = await response.json();
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch profile" }, { status: 500 });
  }
}

