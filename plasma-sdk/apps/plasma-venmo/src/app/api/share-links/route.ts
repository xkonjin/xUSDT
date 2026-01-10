import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";
import { generateShortCode } from "@plasma-pay/share";

// GET /api/share-links - List share links for a user
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const links = await prisma.shareLink.findMany({
    where: { creatorAddress: address.toLowerCase() },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ links });
}

// POST /api/share-links - Create a new share link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { creatorAddress, type, targetUrl, targetData, channel } = body;

    if (!creatorAddress || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const shortCode = generateShortCode(8);

    const link = await prisma.shareLink.create({
      data: {
        creatorAddress: creatorAddress.toLowerCase(),
        type,
        shortCode,
        targetUrl,
        targetData: targetData ? JSON.stringify(targetData) : null,
        channel,
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      link,
      shareUrl: `https://plasma.to/s/${shortCode}`,
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
