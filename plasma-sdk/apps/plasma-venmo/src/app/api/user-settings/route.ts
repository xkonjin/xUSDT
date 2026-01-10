import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";
import { generateReferralCode } from "@plasma-pay/share";

// GET /api/user-settings - Get user settings
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  let settings = await prisma.userSettings.findUnique({
    where: { walletAddress: normalizedAddress },
  });

  // Auto-create settings if they don't exist
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: {
        walletAddress: normalizedAddress,
        referralCode: generateReferralCode(),
      },
    });
  }

  return NextResponse.json({ settings });
}

// POST /api/user-settings - Create or update user settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, displayName, email, phone, preferences } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const settings = await prisma.userSettings.upsert({
      where: { walletAddress: normalizedAddress },
      create: {
        walletAddress: normalizedAddress,
        displayName,
        email,
        phone,
        referralCode: generateReferralCode(),
        preferences: preferences ? JSON.stringify(preferences) : null,
      },
      update: {
        displayName,
        email,
        phone,
        preferences: preferences ? JSON.stringify(preferences) : undefined,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

// GET /api/user-settings/by-code/[code] - Look up user by referral code
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { referralCode } = body;

  if (!referralCode) {
    return NextResponse.json({ error: "Missing referralCode" }, { status: 400 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { referralCode },
  });

  if (!settings) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  }

  return NextResponse.json({
    walletAddress: settings.walletAddress,
    displayName: settings.displayName,
  });
}
