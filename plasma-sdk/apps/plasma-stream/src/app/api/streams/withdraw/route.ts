/**
 * Plasma Stream Withdraw API Route
 *
 * Handles withdrawal requests from stream recipients.
 * Uses StreamService abstraction for mock/contract implementations.
 *
 * Set STREAM_CONTRACT_ADDRESS env var to use real contracts.
 */

import { NextResponse } from "next/server";
import { getStreamService } from "@/lib/contracts";

interface WithdrawRequest {
  streamId: string;
  recipientAddress: string;
}

/**
 * POST /api/streams/withdraw
 *
 * Withdraw available funds from a stream.
 */
export async function POST(request: Request) {
  try {
    const body: WithdrawRequest = await request.json();
    const { streamId, recipientAddress } = body;

    // Validate required fields
    if (!streamId || !recipientAddress) {
      return NextResponse.json(
        { error: "Missing streamId or recipientAddress" },
        { status: 400 }
      );
    }

    // Use stream service abstraction (mock or contract implementation)
    const streamService = getStreamService();
    const result = await streamService.withdraw(streamId, recipientAddress);

    if (!result.success) {
      // Map specific errors to HTTP status codes
      const errorStatus = getErrorStatus(result.error);
      return NextResponse.json(
        { error: result.error, amount: result.amount },
        { status: errorStatus }
      );
    }

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      amount: result.amount,
      amountFormatted: result.amountFormatted,
      details: result.details,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Withdraw failed",
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
  if (error === "Only the recipient can withdraw") return 403;
  if (error === "Stream is not active" || error === "Cliff period not reached") return 400;
  if (error === "No funds available to withdraw") return 200; // Not really an error
  return 500;
}
