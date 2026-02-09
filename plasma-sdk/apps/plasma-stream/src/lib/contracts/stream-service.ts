/**
 * Stream Service - Contract Integration Layer
 *
 * Provides a unified interface for stream operations that can use either:
 * - Mock implementation (database-backed, current behavior)
 * - Real contract implementation (Sablier-style on-chain streaming)
 *
 * The service is determined by the STREAM_CONTRACT_ADDRESS environment variable:
 * - Not set or empty: Uses MockStreamService (database)
 * - Set to contract address: Will use ContractStreamService (not yet implemented)
 */

import { prisma } from "@plasma-pay/db";
import {
  IStreamContract,
  Stream,
  CreateStreamParams,
  CreateStreamResult,
  WithdrawResult,
  CancelResult,
  BalanceInfo,
} from "./stream-contract";

// Re-export types for convenience
export type { Stream, CreateStreamParams };

/**
 * Service type identifier for debugging/logging
 */
export type ServiceType = "mock" | "contract";

/**
 * Extended interface with service type identification
 */
export interface StreamService extends IStreamContract {
  getServiceType(): ServiceType;

  // Convenience aliases matching current API naming
  withdraw(streamId: string, recipientAddress: string): Promise<WithdrawResult>;
  cancel(streamId: string, senderAddress: string): Promise<CancelResult>;
}

/**
 * Mock Stream Service
 *
 * Database-backed implementation for development and testing.
 * Simulates streaming behavior without actual on-chain transactions.
 */
class MockStreamService implements StreamService {
  getServiceType(): ServiceType {
    return "mock";
  }

  async createStream(params: CreateStreamParams): Promise<CreateStreamResult> {
    try {
      const {
        sender,
        recipient,
        depositAmount,
        duration,
        cliffDuration = 0,
        cancelable = true,
      } = params;

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

      // Generate mock transaction hash (simulates on-chain tx)
      const mockTxHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;

      return {
        success: true,
        streamId: stream.id,
        txHash: mockTxHash,
        stream: {
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
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create stream",
      };
    }
  }

  async withdrawFromStream(
    streamId: string,
    recipientAddress: string
  ): Promise<WithdrawResult> {
    return this.withdraw(streamId, recipientAddress);
  }

  async withdraw(
    streamId: string,
    recipientAddress: string
  ): Promise<WithdrawResult> {
    try {
      // Fetch stream from database
      const stream = await prisma.stream.findUnique({
        where: { id: streamId },
      });

      if (!stream) {
        return { success: false, error: "Stream not found" };
      }

      // Verify caller is recipient
      if (stream.recipient.toLowerCase() !== recipientAddress.toLowerCase()) {
        return { success: false, error: "Only the recipient can withdraw" };
      }

      // Check stream is active
      if (!stream.active) {
        return { success: false, error: "Stream is not active" };
      }

      // Calculate withdrawable amount
      const now = Math.floor(Date.now() / 1000);
      const depositAmount = BigInt(stream.depositAmount);
      const withdrawnAmount = BigInt(stream.withdrawnAmount);
      const duration = stream.endTime - stream.startTime;

      // Check cliff
      if (now < stream.cliffTime) {
        return {
          success: false,
          error: "Cliff period not reached",
        };
      }

      // Calculate vested amount
      const elapsed = Math.min(now - stream.startTime, duration);
      const vestedFraction = elapsed / duration;
      const totalVested =
        (depositAmount * BigInt(Math.floor(vestedFraction * 1_000_000))) /
        BigInt(1_000_000);

      // Withdrawable = vested - already withdrawn
      const withdrawable =
        totalVested > withdrawnAmount
          ? totalVested - withdrawnAmount
          : BigInt(0);

      if (withdrawable === BigInt(0)) {
        return {
          success: false,
          error: "No funds available to withdraw",
          amount: "0",
        };
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

      // Generate mock transaction hash
      const mockTxHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;

      return {
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
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Withdraw failed",
      };
    }
  }

  async cancelStream(
    streamId: string,
    senderAddress: string
  ): Promise<CancelResult> {
    return this.cancel(streamId, senderAddress);
  }

  async cancel(streamId: string, senderAddress: string): Promise<CancelResult> {
    try {
      // Fetch stream from database
      const stream = await prisma.stream.findUnique({
        where: { id: streamId },
      });

      if (!stream) {
        return { success: false, error: "Stream not found" };
      }

      // Verify caller is sender
      if (stream.sender.toLowerCase() !== senderAddress.toLowerCase()) {
        return { success: false, error: "Only the sender can cancel" };
      }

      // Check stream is cancelable
      if (!stream.cancelable) {
        return { success: false, error: "This stream is not cancelable" };
      }

      // Check stream is active
      if (!stream.active) {
        return { success: false, error: "Stream is already inactive" };
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
      const remainingForRecipient =
        vestedForRecipient > withdrawnAmount
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

      return {
        success: true,
        txHash: mockTxHash,
        details: {
          streamId,
          totalDeposit: depositAmount.toString(),
          vestedForRecipient: vestedForRecipient.toString(),
          alreadyWithdrawn: withdrawnAmount.toString(),
          remainingForRecipient: remainingForRecipient.toString(),
          refundForSender: refundForSender.toString(),
          refundForSenderFormatted: `${
            Number(refundForSender) / 1_000_000
          } USDT0`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Cancel failed",
      };
    }
  }

  async getStream(streamId: string): Promise<Stream | null> {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return null;
    }

    return {
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
    };
  }

  async balanceOf(streamId: string): Promise<BalanceInfo> {
    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      return {
        withdrawable: "0",
        vested: "0",
        withdrawn: "0",
        total: "0",
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const depositAmount = BigInt(stream.depositAmount);
    const withdrawnAmount = BigInt(stream.withdrawnAmount);
    const duration = stream.endTime - stream.startTime;

    // Before cliff, nothing is withdrawable
    if (now < stream.cliffTime) {
      return {
        withdrawable: "0",
        vested: "0",
        withdrawn: withdrawnAmount.toString(),
        total: depositAmount.toString(),
      };
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

    return {
      withdrawable: withdrawable.toString(),
      vested: totalVested.toString(),
      withdrawn: withdrawnAmount.toString(),
      total: depositAmount.toString(),
    };
  }

  async getStreamsByAddress(
    address: string,
    role: "sending" | "receiving"
  ): Promise<Stream[]> {
    const normalizedAddress = address.toLowerCase();
    const streams = await prisma.stream.findMany({
      where:
        role === "sending"
          ? { sender: normalizedAddress }
          : { recipient: normalizedAddress },
      orderBy: { createdAt: "desc" },
    });

    return streams.map((stream) => ({
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
  }
}

// ContractStreamService: not yet implemented.
// When ready, create a class implementing StreamService with on-chain Sablier-style streaming.

// Singleton instance
let streamServiceInstance: StreamService | null = null;

/**
 * Get the stream service instance
 *
 * Returns MockStreamService. When ContractStreamService is implemented,
 * this will switch based on STREAM_CONTRACT_ADDRESS.
 *
 * Environment variables:
 * - STREAM_CONTRACT_ADDRESS: Contract address for real implementation
 */
export function getStreamService(): StreamService {
  // Return cached instance if available
  if (streamServiceInstance) {
    return streamServiceInstance;
  }

  const contractAddress = process.env.STREAM_CONTRACT_ADDRESS;

  if (contractAddress && contractAddress.length > 0) {
    console.warn(
      "STREAM_CONTRACT_ADDRESS is set but ContractStreamService is not yet implemented. Using MockStreamService."
    );
  }

  streamServiceInstance = new MockStreamService();

  return streamServiceInstance;
}

/**
 * Reset the service instance (for testing)
 */
export function resetStreamService(): void {
  streamServiceInstance = null;
}

// Export default instance getter
export default getStreamService;
