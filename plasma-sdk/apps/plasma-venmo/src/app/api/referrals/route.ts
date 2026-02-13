import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";

// GET /api/referrals - Get referral stats for a user
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  // Get referrals made by this user
  const referralsMade = await prisma.referral.findMany({
    where: { referrerAddress: normalizedAddress },
    orderBy: { createdAt: "desc" },
  });

  // Get referral that brought this user (if any)
  const referredBy = await prisma.referral.findFirst({
    where: { refereeAddress: normalizedAddress },
  });

  // Calculate stats
  const totalReferred = referralsMade.length;
  const pendingRewards = referralsMade.filter(
    (r: (typeof referralsMade)[number]) => r.rewardStatus === "pending"
  ).length;
  const paidRewards = referralsMade.filter(
    (r: (typeof referralsMade)[number]) => r.rewardStatus === "paid"
  ).length;
  const totalEarned = referralsMade
    .filter((r: (typeof referralsMade)[number]) => r.rewardStatus === "paid")
    .reduce(
      (sum: number, r: (typeof referralsMade)[number]) => sum + r.rewardAmount,
      0
    );

  return NextResponse.json({
    stats: {
      totalReferred,
      pendingRewards,
      paidRewards,
      totalEarned,
    },
    referrals: referralsMade,
    referredBy: referredBy?.referrerAddress || null,
  });
}

// POST /api/referrals - Create a referral when someone signs up via referral link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referrerAddress, refereeAddress, source, shareLinkId } = body;

    if (!referrerAddress || !refereeAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if referral already exists
    const existing = await prisma.referral.findUnique({
      where: {
        referrerAddress_refereeAddress: {
          referrerAddress: referrerAddress.toLowerCase(),
          refereeAddress: refereeAddress.toLowerCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Referral already exists" }, { status: 409 });
    }

    // Can't refer yourself
    if (referrerAddress.toLowerCase() === refereeAddress.toLowerCase()) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    const referral = await prisma.referral.create({
      data: {
        referrerAddress: referrerAddress.toLowerCase(),
        refereeAddress: refereeAddress.toLowerCase(),
        source: source || "app",
        shareLinkId,
        rewardAmount: 0.10,
        rewardCurrency: "USDT0",
        rewardStatus: "pending",
      },
    });

    // Update referrer's stats
    await prisma.userSettings.updateMany({
      where: { walletAddress: referrerAddress.toLowerCase() },
      data: { totalReferred: { increment: 1 } },
    });

    return NextResponse.json({ success: true, referral });
  } catch (error) {
    console.error("Error creating referral:", error);
    return NextResponse.json(
      { error: "Failed to create referral" },
      { status: 500 }
    );
  }
}
