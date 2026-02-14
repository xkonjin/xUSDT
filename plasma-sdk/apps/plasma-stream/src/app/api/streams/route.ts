/**
 * Plasma Stream API Routes
 *
 * Handles stream creation and listing for the Plasma Stream app.
 * Uses the StreamService abstraction for easy swapping between
 * mock (database) and real contract implementations.
 *
 * NOTE: Set STREAM_CONTRACT_ADDRESS env var to use real contracts.
 * Without it, uses mock (database) implementation.
 */

import { NextResponse } from "next/server";
import { getStreamService } from "@/lib/contracts";

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
    const role = (searchParams.get("role") || "sending") as
      | "sending"
      | "receiving";

    if (!address) {
      return NextResponse.json(
        { error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // Use stream service abstraction (mock or contract implementation)
    const streamService = getStreamService();
    const streams = await streamService.getStreamsByAddress(address, role);

    return NextResponse.json({
      streams,
    });
  } catch {
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
 * Uses StreamService abstraction - will use real contracts when
 * STREAM_CONTRACT_ADDRESS is set.
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

    // Use stream service abstraction (mock or contract implementation)
    const streamService = getStreamService();
    const result = await streamService.createStream({
      sender,
      recipient,
      depositAmount: depositAmount.toString(),
      duration,
      cliffDuration,
      cancelable,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create stream" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      streamId: result.streamId,
      stream: result.stream,
      txHash: result.txHash,
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
