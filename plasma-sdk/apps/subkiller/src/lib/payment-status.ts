/**
 * Payment Status Service
 * 
 * SUB-002: Server-side payment verification
 * Core business logic for checking payment status from database.
 * Used by /api/payment-status route handler.
 */

import { prisma } from '@plasma-pay/db';

export interface PaymentStatusResult {
  hasPaid: boolean;
  txHash?: string | null;
  paidAt?: string;
}

/**
 * Check if a wallet address has paid for SubKiller Pro
 * 
 * @param address - Wallet address to check (will be normalized to lowercase)
 * @returns Payment status with details if paid
 */
export async function getPaymentStatus(address: string): Promise<PaymentStatusResult> {
  // Normalize address to lowercase for consistent lookup
  const normalizedAddress = address.toLowerCase();

  const payment = await prisma.subKillerPayment.findUnique({
    where: { walletAddress: normalizedAddress },
  });

  if (!payment) {
    return { hasPaid: false };
  }

  return {
    hasPaid: true,
    txHash: payment.txHash,
    paidAt: payment.createdAt.toISOString(),
  };
}
