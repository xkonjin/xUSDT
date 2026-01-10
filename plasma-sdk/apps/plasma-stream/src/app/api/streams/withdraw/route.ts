/**
 * Plasma Stream Withdraw API Route
 *
 * Handles withdrawal requests from stream recipients.
 * Updates the database to track withdrawn amounts.
 *
 * NOTE: This simulates withdrawals - no actual funds are transferred.
 * For production, integrate with on-chain streaming contracts.
 */

import { NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";

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

    // Fetch stream from database
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // Verify caller is recipient
    if (stream.recipient.toLowerCase() !== recipientAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Only the recipient can withdraw" },
        { status: 403 }
      );
    }

    // Check stream is active
    if (!stream.active) {
      return NextResponse.json(
        { error: "Stream is not active" },
        { status: 400 }
      );
    }

    // Calculate withdrawable amount
    const now = Math.floor(Date.now() / 1000);
    const depositAmount = BigInt(stream.depositAmount);
    const withdrawnAmount = BigInt(stream.withdrawnAmount);
    const duration = stream.endTime - stream.startTime;

    // Check cliff
    if (now < stream.cliffTime) {
      return NextResponse.json(
        {
          error: "Cliff period not reached",
          cliffTime: stream.cliffTime,
          currentTime: now,
        },
        { status: 400 }
      );
    }

    // Calculate vested amount
    const elapsed = Math.min(now - stream.startTime, duration);
    const vestedFraction = elapsed / duration;
    const totalVested =
      (depositAmount * BigInt(Math.floor(vestedFraction * 1_000_000))) /
      BigInt(1_000_000);

    // Withdrawable = vested - already withdrawn
    const withdrawable =
      totalVested > withdrawnAmount ? totalVested - withdrawnAmount : BigInt(0);

    if (withdrawable === BigInt(0)) {
      return NextResponse.json({
        success: false,
        error: "No funds available to withdraw",
        amount: "0",
      });
    }

    // Update withdrawn amount in database
    const newWithdrawnAmount = withdrawnAmount + withdrawable;
    await prisma.stream.update({
      where: { id: streamId },
      data: {
        withdrawnAmount: newWithdrawnAmount.toString(),
        // Mark as inactive if fully withdrawn
        active: newWithdrawnAmount < depositAmount,
      },
    });

    // Generate mock transaction hash (in production, this would be real)
    const mockTxHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    return NextResponse.json({
      success: true,
      txHash: mockTxHash,
      amount: withdrawable.toString(),
      amountFormatted: `${Number(withdrawable) / 1_000_000} USDT0`,
      details: {
        streamId,
        totalVested: totalVested.toString(),
        previouslyWithdrawn: withdrawnAmount.toString(),
        newWithdrawal: withdrawable.toString(),
        remainingInStream: (depositAmount - newWithdrawnAmount).toString(),
      },
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
