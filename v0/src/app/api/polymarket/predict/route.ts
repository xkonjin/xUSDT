/**
 * Polymarket Predict API Route
 *
 * Proxies prediction submissions to the FastAPI backend.
 * Creates a mock order for the prediction (no real CLOB orders in MVP).
 *
 * Request Body:
 *   - user_address: string - User's wallet address
 *   - market_id: string - Polymarket market ID
 *   - market_question: string - Market question (cached)
 *   - outcome: string - Selected outcome (Yes/No)
 *   - amount: number - Bet amount in atomic units (6 decimals)
 *
 * Usage:
 *   POST /api/polymarket/predict
 *   Body: { user_address: "0x...", market_id: "...", outcome: "Yes", amount: 1000000 }
 */

import { NextRequest, NextResponse } from "next/server";

// Backend URL for the FastAPI merchant service
const BACKEND_URL =
  process.env.POLYMARKET_BACKEND_URL ||
  process.env.MERCHANT_URL ||
  process.env.NEXT_PUBLIC_MERCHANT_URL ||
  "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate required fields
    const { user_address, market_id, market_question, outcome, amount } = body;

    if (!user_address || !market_id || !market_question || !outcome || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: user_address, market_id, market_question, outcome, amount",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!user_address.startsWith("0x") || user_address.length !== 42) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Validate amount (minimum 0.001 USDT0 = 1000 atomic units)
    if (typeof amount !== "number" || amount < 1000) {
      return NextResponse.json(
        { success: false, error: "Minimum bet amount is 0.001 USDT0 (1000 atomic units)" },
        { status: 400 }
      );
    }

    // Build the backend URL for the predict endpoint
    const backendUrl = `${BACKEND_URL.replace(/\/$/, "")}/polymarket/predict`;

    // Forward the prediction request to the FastAPI backend
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        user_address,
        market_id,
        market_question,
        outcome,
        amount,
      }),
    });

    // Parse the response
    const data = await response.json();

    // Return the response with the same status code
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error submitting prediction:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit prediction",
        hint: "Check if the backend server is running",
      },
      { status: 502 }
    );
  }
}

