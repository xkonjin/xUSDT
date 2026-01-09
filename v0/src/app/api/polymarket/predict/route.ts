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
import {
  proxyPost,
  isValidWalletAddress,
  isValidBetAmount,
} from "../../../../lib/api-helpers";
import { MIN_BET_AMOUNT_ATOMIC } from "../../../../lib/polymarket-config";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate required fields
    const { user_address, market_id, market_question, outcome, amount } = body;

    if (!user_address || !market_id || !market_question || !outcome || amount === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: user_address, market_id, market_question, outcome, amount",
        },
        { status: 400 }
      );
    }

    // Validate wallet address format (checks 0x + 40 hex chars)
    if (!isValidWalletAddress(user_address)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format. Expected 0x followed by 40 hex characters." },
        { status: 400 }
      );
    }

    // Validate amount is a valid integer and meets minimum
    if (!isValidBetAmount(amount, MIN_BET_AMOUNT_ATOMIC)) {
      return NextResponse.json(
        { success: false, error: `Minimum bet amount is ${MIN_BET_AMOUNT_ATOMIC} atomic units (0.001 USDT0)` },
        { status: 400 }
      );
    }

    // Proxy to backend
    return proxyPost("/polymarket/predict", {
      user_address,
      market_id,
      market_question,
      outcome,
      amount,
    });
  } catch (error) {
    console.error("Error in predict route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to submit prediction",
      },
      { status: 500 }
    );
  }
}
