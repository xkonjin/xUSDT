import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";

// GET /api/share-links/[code] - Get link by short code and track click
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  const link = await prisma.shareLink.findUnique({
    where: { shortCode: code },
  });

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (link.status !== "active") {
    return NextResponse.json({ error: "Link is no longer active" }, { status: 410 });
  }

  // Track click (async, don't block response)
  prisma.shareLink.update({
    where: { id: link.id },
    data: {
      clickCount: { increment: 1 },
      lastClickedAt: new Date(),
    },
  }).catch(console.error);

  return NextResponse.json({
    link: {
      type: link.type,
      targetUrl: link.targetUrl,
      targetData: link.targetData ? JSON.parse(link.targetData) : null,
      creatorAddress: link.creatorAddress,
    },
  });
}

// POST /api/share-links/[code]/convert - Track conversion
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  try {
    await prisma.shareLink.update({
      where: { shortCode: code },
      data: {
        convertCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
}
