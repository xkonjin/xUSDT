/**
 * Plasma Stream Cancel API Route
 *
 * Handles stream cancellation requests from stream senders.
 * Uses StreamService abstraction for mock/contract implementations.
 *
 * Set STREAM_CONTRACT_ADDRESS env var to use real contracts.
 */

import { NextResponse } from "next/server";
import { getStreamService } from "@/lib/contracts";

interface CancelRequest {
  streamId: string;
  senderAddress: string;
}

/**
 * POST /api/streams/cancel
 *
 * Cancel an active stream (sender only).
 */
export async function POST(request: Request) {
  try {
    const body: CancelRequest = await request.json();
    const { streamId, senderAddress } = body;

    // Validate required fields
    if (!streamId || !senderAddress) {
      return NextResponse.json(
        { error: "Missing streamId or senderAddress" },
        { status: 400 }
      );
    }

    // Use stream service abstraction (mock or contract implementation)
    const streamService = getStreamService();
    const result = await streamService.cancel(streamId, senderAddress);

    if (!result.success) {
      // Map specific errors to HTTP status codes
      const errorStatus = getErrorStatus(result.error);
      return NextResponse.json(
        { error: result.error },
        { status: errorStatus }
      );
    }

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      details: result.details,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Cancel failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Map error messages to HTTP status codes
 */
function getErrorStatus(error?: string): number {
  if (!error) return 500;
  if (error === "Stream not found") return 404;
  if (error === "Only the sender can cancel") return 403;
  if (error === "This stream is not cancelable" || error === "Stream is already inactive") return 400;
  return 500;
}
