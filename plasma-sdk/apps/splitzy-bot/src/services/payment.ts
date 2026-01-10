/**
 * Payment Service
 * 
 * Handles payment intent creation and management.
 * Payment intents are the link between QR codes and actual payments.
 */

import { nanoid } from 'nanoid';
import type { PaymentIntent, ActiveBill, BillParticipant } from '../types.js';
import { PAYMENT_INTENT_EXPIRY_MS } from '../types.js';

// ============================================================================
// IN-MEMORY STORAGE (Replace with database in production)
// ============================================================================

/**
 * In-memory storage for payment intents
 * In production, use the @plasma-pay/db package
 */
const paymentIntentsStore = new Map<string, PaymentIntent>();
const billsStore = new Map<string, {
  bill: ActiveBill;
  creatorTelegramId: string;
  paymentIntents: PaymentIntent[];
  createdAt: Date;
}>();

// ============================================================================
// PAYMENT INTENT OPERATIONS
// ============================================================================

/**
 * Creates payment intents for all participants in a bill
 * Each participant gets a unique payment intent with a QR code
 * 
 * @param bill - The active bill being split
 * @param creatorTelegramId - Telegram user ID of the bill creator
 * @returns Array of created payment intents
 */
export async function createPaymentIntents(
  bill: ActiveBill,
  creatorTelegramId: string
): Promise<PaymentIntent[]> {
  // Generate bill ID
  const billId = nanoid(12);
  
  // Create payment intent for each participant
  const paymentIntents: PaymentIntent[] = bill.participants.map((participant, index) => {
    const intent: PaymentIntent = {
      id: nanoid(16), // Short ID for QR codes
      billId,
      participantIndex: index,
      amountUsd: participant.share,
      recipientAddress: bill.creatorAddress || '',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + PAYMENT_INTENT_EXPIRY_MS),
    };
    
    // Store intent
    paymentIntentsStore.set(intent.id, intent);
    
    return intent;
  });
  
  // Store bill with intents
  billsStore.set(billId, {
    bill,
    creatorTelegramId,
    paymentIntents,
    createdAt: new Date(),
  });
  
  console.log(`Created ${paymentIntents.length} payment intents for bill ${billId}`);
  
  return paymentIntents;
}

/**
 * Gets a payment intent by ID
 * 
 * @param intentId - Payment intent ID
 * @returns Payment intent or null if not found/expired
 */
export async function getPaymentIntent(intentId: string): Promise<PaymentIntent | null> {
  const intent = paymentIntentsStore.get(intentId);
  
  if (!intent) {
    return null;
  }
  
  // Check if expired
  if (intent.expiresAt < new Date()) {
    intent.status = 'expired';
    return null;
  }
  
  return intent;
}

/**
 * Updates a payment intent status
 * 
 * @param intentId - Payment intent ID
 * @param updates - Fields to update
 * @returns Updated payment intent
 */
export async function updatePaymentIntent(
  intentId: string,
  updates: Partial<PaymentIntent>
): Promise<PaymentIntent | null> {
  const intent = paymentIntentsStore.get(intentId);
  
  if (!intent) {
    return null;
  }
  
  // Apply updates
  Object.assign(intent, updates);
  
  // Store updated intent
  paymentIntentsStore.set(intentId, intent);
  
  return intent;
}

/**
 * Marks a payment intent as completed
 * Called when payment is confirmed on-chain
 * 
 * @param intentId - Payment intent ID
 * @param paymentDetails - Details of the completed payment
 * @returns Updated payment intent
 */
export async function completePaymentIntent(
  intentId: string,
  paymentDetails: {
    payerAddress: string;
    sourceChainId?: number;
    sourceToken?: string;
    sourceTxHash?: string;
    destTxHash: string;
    bridgeProvider?: 'jumper' | 'debridge';
  }
): Promise<PaymentIntent | null> {
  const intent = await updatePaymentIntent(intentId, {
    status: 'completed',
    payerAddress: paymentDetails.payerAddress,
    sourceChainId: paymentDetails.sourceChainId,
    sourceToken: paymentDetails.sourceToken,
    sourceTxHash: paymentDetails.sourceTxHash,
    destTxHash: paymentDetails.destTxHash,
    bridgeProvider: paymentDetails.bridgeProvider,
    paidAt: new Date(),
  });
  
  if (intent) {
    console.log(`Payment intent ${intentId} completed: ${paymentDetails.destTxHash}`);
    
    // Check if all participants have paid
    await checkBillCompletion(intent.billId);
  }
  
  return intent;
}

/**
 * Gets all payment intents for a bill
 * 
 * @param billId - Bill ID
 * @returns Array of payment intents
 */
export async function getPaymentIntentsForBill(billId: string): Promise<PaymentIntent[]> {
  const billData = billsStore.get(billId);
  return billData?.paymentIntents || [];
}

/**
 * Gets the bill data for a payment intent
 * 
 * @param intentId - Payment intent ID
 * @returns Bill data or null
 */
export async function getBillForIntent(intentId: string): Promise<{
  bill: ActiveBill;
  creatorTelegramId: string;
  paymentIntents: PaymentIntent[];
} | null> {
  const intent = paymentIntentsStore.get(intentId);
  if (!intent) return null;
  
  return billsStore.get(intent.billId) || null;
}

/**
 * Checks if all participants have paid and updates bill status
 * 
 * @param billId - Bill ID to check
 */
async function checkBillCompletion(billId: string): Promise<void> {
  const billData = billsStore.get(billId);
  if (!billData) return;
  
  const allPaid = billData.paymentIntents.every(intent => intent.status === 'completed');
  
  if (allPaid) {
    console.log(`Bill ${billId} fully paid!`);
    
    // TODO: Send notification to bill creator
    // This would be done via the Telegram bot API
  }
}

/**
 * Cleans up expired payment intents
 * Should be called periodically
 */
export async function cleanupExpiredIntents(): Promise<number> {
  const now = new Date();
  let cleaned = 0;
  
  for (const [id, intent] of paymentIntentsStore) {
    if (intent.status === 'pending' && intent.expiresAt < now) {
      intent.status = 'expired';
      cleaned++;
    }
  }
  
  console.log(`Cleaned up ${cleaned} expired payment intents`);
  return cleaned;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Gets statistics about payment intents
 */
export function getStats(): {
  totalIntents: number;
  pendingIntents: number;
  completedIntents: number;
  totalBills: number;
} {
  let pending = 0;
  let completed = 0;
  
  for (const intent of paymentIntentsStore.values()) {
    if (intent.status === 'pending') pending++;
    if (intent.status === 'completed') completed++;
  }
  
  return {
    totalIntents: paymentIntentsStore.size,
    pendingIntents: pending,
    completedIntents: completed,
    totalBills: billsStore.size,
  };
}

