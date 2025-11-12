/**
 * Polymarket Predict/Bet API Route
 * 
 * Places a bet on a Polymarket market using USDT0.
 * Handles conversion and order placement.
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields (now uses bet_amount_usdc instead of bet_amount_usdt0)
    const required = ["user_address", "market_id", "market_question", "outcome", "bet_amount_usdc", "token_id"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const response = await fetch(`${BACKEND_URL}/polymarket/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Failed to place bet" }));
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error placing bet:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to place bet" },
      { status: 500 }
    );
  }
}

