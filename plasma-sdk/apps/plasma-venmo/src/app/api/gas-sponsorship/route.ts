import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";

const DAILY_TX_LIMIT = 10;
const DAILY_USD_LIMIT = 10000; // $10,000 USDT0 per day

// GET /api/gas-sponsorship - Check if user is eligible for gas sponsorship
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  // Get today's sponsored transactions for this user
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLogs = await prisma.gasSponsorshipLog.findMany({
    where: {
      userAddress: normalizedAddress,
      createdAt: { gte: today },
    },
  });

  const txCount = todayLogs.length;
  const totalCostUsd = todayLogs.reduce(
    (sum: number, log: (typeof todayLogs)[number]) => sum + log.gasCostUsd,
    0
  );

  const eligible = txCount < DAILY_TX_LIMIT && totalCostUsd < DAILY_USD_LIMIT;

  return NextResponse.json({
    eligible,
    stats: {
      txCount,
      txLimit: DAILY_TX_LIMIT,
      totalCostUsd,
      costLimit: DAILY_USD_LIMIT,
      remaining: DAILY_TX_LIMIT - txCount,
    },
  });
}

// POST /api/gas-sponsorship - Log a sponsored transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, txHash, gasUsed, gasCostUsd, txType } = body;

    if (!userAddress || !txHash || !txType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const log = await prisma.gasSponsorshipLog.create({
      data: {
        userAddress: userAddress.toLowerCase(),
        txHash,
        gasUsed: gasUsed?.toString() || "0",
        gasCostUsd: gasCostUsd || 0,
        txType,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Error logging gas sponsorship:", error);
    return NextResponse.json(
      { error: "Failed to log sponsorship" },
      { status: 500 }
    );
  }
}
