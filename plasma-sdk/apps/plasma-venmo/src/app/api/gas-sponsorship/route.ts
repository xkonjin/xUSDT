import { NextRequest, NextResponse } from "next/server";
import {
  checkGasBudget,
  getUserDailyUsage,
  logGasSponsorship,
} from "@/lib/gas-tracking";
import { DAILY_FREE_TX_LIMIT } from "@/lib/constants";

// GET /api/gas-sponsorship - Check user's current sponsorship usage
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    const { txCount, totalGasCostUSD } = await getUserDailyUsage(address);
    const budget = await checkGasBudget(address);

    return NextResponse.json({
      eligible: budget.allowed,
      used: txCount,
      limit: DAILY_FREE_TX_LIMIT,
      remaining: budget.remaining,
      totalGasCostUSD,
      resetsAt: budget.resetsAt,
    });
  } catch (error) {
    console.error("Error checking gas sponsorship:", error);
    return NextResponse.json(
      { error: "Failed to check sponsorship" },
      { status: 500 }
    );
  }
}

// POST /api/gas-sponsorship - Log a sponsored transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, txHash, gasUsed, gasCostUsd, txType } = body;

    if (!userAddress || !txHash || !txType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const log = await logGasSponsorship(
      userAddress,
      txHash,
      gasUsed?.toString() || "0",
      gasCostUsd || 0,
      txType
    );

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Error logging gas sponsorship:", error);
    return NextResponse.json(
      { error: "Failed to log sponsorship" },
      { status: 500 }
    );
  }
}
