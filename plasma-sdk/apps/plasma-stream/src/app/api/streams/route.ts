/**
 * Plasma Stream API Routes
 *
 * Handles stream creation and listing for the Plasma Stream app.
 * Streams are now persisted to database (no longer demo mode).
 *
 * NOTE: This is a simulation - no actual funds are locked on-chain.
 * For production, integrate with on-chain streaming contracts (Sablier-style).
 */

import { NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";

/**
 * GET /api/streams
 *
 * List streams for a specific address, filtered by role.
 *
 * Query params:
 * - address: Wallet address to filter by (required)
 * - role: 'sending' or 'receiving' (default: 'sending')
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const role = searchParams.get("role") || "sending";

    if (!address) {
      return NextResponse.json(
        { error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // Query streams from database (normalize address for case-insensitive matching)
    const normalizedAddress = address.toLowerCase();
    const streams = await prisma.stream.findMany({
      where: role === "sending"
        ? { sender: normalizedAddress }
        : { recipient: normalizedAddress },
      orderBy: { createdAt: "desc" },
    });

    // Transform for frontend (convert string BigInts back)
    const serializedStreams = streams.map((stream) => ({
      id: stream.id,
      sender: stream.sender,
      recipient: stream.recipient,
      depositAmount: stream.depositAmount,
      withdrawnAmount: stream.withdrawnAmount,
      startTime: stream.startTime,
      endTime: stream.endTime,
      cliffTime: stream.cliffTime,
      cliffAmount: stream.cliffAmount,
      ratePerSecond: stream.ratePerSecond,
      cancelable: stream.cancelable,
      active: stream.active,
    }));

    return NextResponse.json({
      streams: serializedStreams,
    });
  } catch (error) {
    return NextResponse.json(
      { streams: [], error: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streams
 *
 * Create a new payment stream.
 *
 * Request body:
 * - sender: Sender wallet address
 * - recipient: Recipient wallet address
 * - depositAmount: Total amount to stream (in smallest unit, 6 decimals)
 * - duration: Stream duration in seconds
 * - cliffDuration: Optional cliff period in seconds (default: 0)
 * - cancelable: Whether sender can cancel the stream (default: true)
 *
 * NOTE: This simulates stream creation. In production, this would:
 * 1. Verify sender has sufficient USDT0 balance
 * 2. Lock funds in a streaming contract
 * 3. Return the stream ID from the contract event
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sender,
      recipient,
      depositAmount,
      duration,
      cliffDuration = 0,
      cancelable = true,
    } = body;

    // Validate required fields
    if (!sender || !recipient || !depositAmount || !duration) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["sender", "recipient", "depositAmount", "duration"],
        },
        { status: 400 }
      );
    }

    // Validate addresses
    if (
      !sender.match(/^0x[a-fA-F0-9]{40}$/) ||
      !recipient.match(/^0x[a-fA-F0-9]{40}$/)
    ) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    // Validate sender != recipient
    if (sender.toLowerCase() === recipient.toLowerCase()) {
      return NextResponse.json(
        { error: "Sender and recipient cannot be the same" },
        { status: 400 }
      );
    }

    // Validate duration is reasonable (at least 1 hour, max 10 years)
    const minDuration = 60 * 60; // 1 hour
    const maxDuration = 10 * 365 * 24 * 60 * 60; // 10 years
    if (duration < minDuration || duration > maxDuration) {
      return NextResponse.json(
        { error: `Duration must be between 1 hour and 10 years` },
        { status: 400 }
      );
    }

    // Calculate stream parameters
    const now = Math.floor(Date.now() / 1000);
    const depositAmountBigInt = BigInt(depositAmount);
    const durationBigInt = BigInt(duration);
    const ratePerSecond = depositAmountBigInt / durationBigInt;
    const cliffAmount =
      cliffDuration > 0
        ? (depositAmountBigInt * BigInt(cliffDuration)) / durationBigInt
        : BigInt(0);

    // Create stream in database
    const stream = await prisma.stream.create({
      data: {
        sender: sender.toLowerCase(),
        recipient: recipient.toLowerCase(),
        depositAmount: depositAmountBigInt.toString(),
        withdrawnAmount: "0",
        startTime: now,
        endTime: now + duration,
        cliffTime: now + cliffDuration,
        cliffAmount: cliffAmount.toString(),
        ratePerSecond: ratePerSecond.toString(),
        cancelable,
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      streamId: stream.id,
      stream: {
        id: stream.id,
        sender: stream.sender,
        recipient: stream.recipient,
        depositAmount: stream.depositAmount,
        withdrawnAmount: "0",
        startTime: stream.startTime,
        endTime: stream.endTime,
        cliffTime: stream.cliffTime,
        ratePerSecond: stream.ratePerSecond,
        cancelable: stream.cancelable,
        active: stream.active,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create stream",
      },
      { status: 500 }
    );
  }
}
