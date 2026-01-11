/**
 * Plasma Stream Cancel API Route
 *
 * Handles stream cancellation requests from stream senders.
 * Calculates vested amount for recipient and refunds remaining to sender.
 *
 * NOTE: This simulates cancellation - no actual funds are transferred.
 * For production, integrate with on-chain streaming contracts.
 */

import { NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";

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

    // Fetch stream from database
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // Verify caller is sender
    if (stream.sender.toLowerCase() !== senderAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Only the sender can cancel" },
        { status: 403 }
      );
    }

    // Check stream is cancelable
    if (!stream.cancelable) {
      return NextResponse.json(
        { error: "This stream is not cancelable" },
        { status: 400 }
      );
    }

    // Check stream is active
    if (!stream.active) {
      return NextResponse.json(
        { error: "Stream is already inactive" },
        { status: 400 }
      );
    }

    // Calculate vested amount at cancellation time
    const now = Math.floor(Date.now() / 1000);
    const depositAmount = BigInt(stream.depositAmount);
    const withdrawnAmount = BigInt(stream.withdrawnAmount);
    const duration = stream.endTime - stream.startTime;

    let vestedForRecipient = BigInt(0);
    
    // If past cliff, calculate vested amount
    if (now >= stream.cliffTime) {
      const elapsed = Math.min(now - stream.startTime, duration);
      const vestedFraction = elapsed / duration;
      vestedForRecipient =
        (depositAmount * BigInt(Math.floor(vestedFraction * 1_000_000))) /
        BigInt(1_000_000);
    }

    // Remaining for recipient = vested - already withdrawn
    const remainingForRecipient = vestedForRecipient > withdrawnAmount 
      ? vestedForRecipient - withdrawnAmount 
      : BigInt(0);

    // Refund for sender = total - vested
    const refundForSender = depositAmount - vestedForRecipient;

    // Update stream in database
    await prisma.stream.update({
      where: { id: streamId },
      data: {
        active: false,
        // Set withdrawn to vested (recipient can still claim up to this)
        withdrawnAmount: vestedForRecipient.toString(),
      },
    });

    // Generate mock transaction hash
    const mockTxHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    return NextResponse.json({
      success: true,
      txHash: mockTxHash,
      details: {
        streamId,
        totalDeposit: depositAmount.toString(),
        vestedForRecipient: vestedForRecipient.toString(),
        alreadyWithdrawn: withdrawnAmount.toString(),
        remainingForRecipient: remainingForRecipient.toString(),
        refundForSender: refundForSender.toString(),
        refundForSenderFormatted: `${Number(refundForSender) / 1_000_000} USDT0`,
      },
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
