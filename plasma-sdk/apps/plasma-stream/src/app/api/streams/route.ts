/**
 * Plasma Stream API Routes
 *
 * Handles stream creation and listing for the Plasma Stream MVP.
 *
 * IMPORTANT: DEMO MODE
 * ====================
 * This implementation uses in-memory storage for demonstration purposes.
 * Streams are NOT persisted across server restarts and NO actual funds
 * are transferred.
 *
 * For production, this would need:
 * 1. On-chain streaming contracts (like Sablier or similar)
 * 2. Database persistence for stream metadata
 * 3. Actual USDT0 fund locking on stream creation
 *
 * Current flow (demo):
 * 1. User creates a stream via POST
 * 2. Stream is stored in memory with mock data
 * 3. User can view streams via GET
 * 4. Withdrawals return mock success (no actual transfer)
 *
 * Production flow would be:
 * 1. User signs transaction to lock funds in streaming contract
 * 2. Stream contract holds funds and releases linearly over time
 * 3. Recipient can withdraw available funds at any time
 * 4. Sender can cancel (if cancelable) and reclaim remaining funds
 */

import { NextResponse } from "next/server";
import type { Stream } from "@plasma-pay/core";
import type { Address } from "viem";

// ============================================================================
// DEMO MODE: In-memory stream storage
// ============================================================================
// WARNING: This resets on server restart. For production, use database + on-chain contracts.
// The mockStreams array simulates what would normally be contract state.

const mockStreams: Stream[] = [];

// Seed with demo streams for testing
const DEMO_ADDRESSES = {
  alice: "0x1234567890123456789012345678901234567890" as const,
  bob: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as const,
};

// Initialize with sample streams if empty (for demo purposes)
function initDemoStreams() {
  if (mockStreams.length === 0 && process.env.DEMO_MODE === "true") {
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;

    // Sample active stream
    mockStreams.push({
      id: BigInt(1),
      sender: DEMO_ADDRESSES.alice,
      recipient: DEMO_ADDRESSES.bob,
      depositAmount: BigInt(1000_000000), // 1000 USDT0
      withdrawnAmount: BigInt(250_000000), // 250 withdrawn
      startTime: now - 15 * day,
      endTime: now + 15 * day,
      cliffTime: now - 10 * day,
      cliffAmount: BigInt(100_000000),
      ratePerSecond: BigInt(1000_000000) / BigInt(30 * day),
      cancelable: true,
      active: true,
    });
  }
}

/**
 * GET /api/streams
 *
 * List streams for a specific address, filtered by role.
 *
 * Query params:
 * - address: Wallet address to filter by (required)
 * - role: 'sending' or 'receiving' (default: 'sending')
 *
 * Response:
 * - streams: Array of Stream objects
 * - demoMode: Boolean indicating this is demo data
 */
export async function GET(request: Request) {
  try {
    // Initialize demo data if configured
    initDemoStreams();

    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const role = searchParams.get("role") || "sending";

    if (!address) {
      return NextResponse.json(
        { error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // Filter streams by sender or recipient based on role
    const filtered = mockStreams.filter((s) =>
      role === "sending"
        ? s.sender.toLowerCase() === address.toLowerCase()
        : s.recipient.toLowerCase() === address.toLowerCase()
    );

    // Convert BigInt to string for JSON serialization
    const serializableStreams = filtered.map((stream) => ({
      ...stream,
      id: stream.id.toString(),
      depositAmount: stream.depositAmount.toString(),
      withdrawnAmount: stream.withdrawnAmount.toString(),
      cliffAmount: stream.cliffAmount.toString(),
      ratePerSecond: stream.ratePerSecond.toString(),
    }));

    return NextResponse.json({
      streams: serializableStreams,
      demoMode: true, // Always indicate this is demo mode
      message:
        "Demo mode: Streams are not persisted and no real funds are transferred.",
    });
  } catch (error) {
    console.error("Stream GET error:", error);
    return NextResponse.json(
      { streams: [], demoMode: true, error: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streams
 *
 * Create a new payment stream (DEMO MODE - no actual fund transfer).
 *
 * Request body:
 * - sender: Sender wallet address
 * - recipient: Recipient wallet address
 * - depositAmount: Total amount to stream (in smallest unit, 6 decimals)
 * - duration: Stream duration in seconds
 * - cliffDuration: Optional cliff period in seconds (default: 0)
 * - cancelable: Whether sender can cancel the stream (default: true)
 *
 * Response:
 * - success: Boolean
 * - streamId: Created stream ID
 * - demoMode: Boolean indicating no real transfer occurred
 *
 * PRODUCTION NOTE:
 * In production, this endpoint would:
 * 1. Validate sender has sufficient USDT0 balance
 * 2. Create EIP-712 typed data for stream contract
 * 3. Submit signed authorization to lock funds in contract
 * 4. Return stream ID from contract event
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

    // Create new stream
    const stream: Stream = {
      id: BigInt(mockStreams.length + 1),
      sender: sender as Address,
      recipient: recipient as Address,
      depositAmount: depositAmountBigInt,
      withdrawnAmount: BigInt(0),
      startTime: now,
      endTime: now + duration,
      cliffTime: now + cliffDuration,
      cliffAmount:
        cliffDuration > 0
          ? (depositAmountBigInt * BigInt(cliffDuration)) / durationBigInt
          : BigInt(0),
      ratePerSecond: depositAmountBigInt / durationBigInt,
      cancelable,
      active: true,
    };

    // Store in mock array
    mockStreams.push(stream);

    return NextResponse.json({
      success: true,
      streamId: stream.id.toString(),
      demoMode: true,
      message:
        "Demo mode: No actual funds were transferred. In production, this would lock USDT0 in a streaming contract.",
      // Return stream details for immediate UI update
      stream: {
        id: stream.id.toString(),
        sender: stream.sender,
        recipient: stream.recipient,
        depositAmount: stream.depositAmount.toString(),
        withdrawnAmount: "0",
        startTime: stream.startTime,
        endTime: stream.endTime,
        cliffTime: stream.cliffTime,
        ratePerSecond: stream.ratePerSecond.toString(),
        cancelable: stream.cancelable,
        active: stream.active,
      },
    });
  } catch (error) {
    console.error("Stream POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create stream",
      },
      { status: 500 }
    );
  }
}
