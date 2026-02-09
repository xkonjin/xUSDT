/**
 * Payment Links API
 *
 * Handles creation and listing of shareable payment links.
 * A payment link allows anyone to pay the creator a specified (or any) amount.
 *
 * Endpoints:
 * - POST /api/payment-links - Create a new payment link
 * - GET /api/payment-links - List payment links for a user
 */

import { NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";
import type { Address } from "viem";
import {
  checkRateLimit,
  rateLimitResponse,
  validateAddress,
} from "@/lib/api-utils";
import { RATE_LIMIT_CONFIGS } from "@/lib/rate-limiter";

/**
 * POST /api/payment-links
 *
 * Creates a new shareable payment link.
 *
 * Request body:
 * - creatorAddress: The wallet address that will receive payments
 * - creatorEmail: Optional email for notifications
 * - amount: Optional fixed amount (if omitted, payer can choose any amount)
 * - memo: Optional description/note
 * - expiresInDays: Optional expiration in days (default: never expires)
 */
export async function POST(request: Request) {
  // Rate limiting
  const { allowed, retryAfter } = checkRateLimit(
    request,
    RATE_LIMIT_CONFIGS.payment
  );
  if (!allowed && retryAfter) {
    return rateLimitResponse(retryAfter);
  }

  try {
    const body = await request.json();
    const { creatorAddress, creatorEmail, amount, memo, expiresInDays } = body;

    // Validate creatorAddress
    const addrValidation = validateAddress(creatorAddress);
    if (!addrValidation.valid) {
      return NextResponse.json(
        { error: addrValidation.error || "Invalid creatorAddress" },
        { status: 400 }
      );
    }

    // Calculate expiration if specified
    let expiresAt: Date | undefined;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }

    // Create the payment link in the database
    const paymentLink = await prisma.paymentLink.create({
      data: {
        creatorAddress: creatorAddress as Address,
        creatorEmail,
        amount: amount ? parseFloat(amount) : null,
        memo,
        currency: "USDT0",
        status: "active",
        expiresAt,
      },
    });

    // Generate the shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
    const payUrl = `${baseUrl}/pay/${paymentLink.id}`;

    return NextResponse.json({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        creatorAddress: paymentLink.creatorAddress,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        memo: paymentLink.memo,
        status: paymentLink.status,
        expiresAt: paymentLink.expiresAt?.toISOString(),
        createdAt: paymentLink.createdAt.toISOString(),
        url: payUrl,
      },
    });
  } catch (error) {
    console.error("Create payment link error:", error);
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment-links
 *
 * Lists all payment links for a creator address.
 *
 * Query params:
 * - address: The creator wallet address (required)
 * - status: Optional filter by status (active, paid, expired)
 */
export async function GET(request: Request) {
  // Rate limiting
  const { allowed: rlAllowed, retryAfter: rlRetry } = checkRateLimit(
    request,
    RATE_LIMIT_CONFIGS.read
  );
  if (!rlAllowed && rlRetry) {
    return rateLimitResponse(rlRetry);
  }

  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const status = searchParams.get("status");

    // Validate address
    const addrValidation = validateAddress(address);
    if (!addrValidation.valid) {
      return NextResponse.json(
        { error: addrValidation.error || "Invalid address" },
        { status: 400 }
      );
    }
    const normalizedAddress = addrValidation.normalized!;

    // Build query filters
    const where: {
      creatorAddress: string;
      status?: string;
    } = {
      creatorAddress: normalizedAddress,
    };

    if (status) {
      where.status = status;
    }

    // Fetch payment links from database
    const paymentLinks = await prisma.paymentLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Generate URLs for each link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
    const linksWithUrls = paymentLinks.map((link) => ({
      id: link.id,
      creatorAddress: link.creatorAddress,
      amount: link.amount,
      currency: link.currency,
      memo: link.memo,
      status: link.status,
      paidBy: link.paidBy,
      paidAt: link.paidAt?.toISOString(),
      txHash: link.txHash,
      expiresAt: link.expiresAt?.toISOString(),
      createdAt: link.createdAt.toISOString(),
      url: `${baseUrl}/pay/${link.id}`,
    }));

    return NextResponse.json({
      success: true,
      paymentLinks: linksWithUrls,
    });
  } catch (error) {
    console.error("List payment links error:", error);
    return NextResponse.json(
      { error: "Failed to list payment links" },
      { status: 500 }
    );
  }
}
