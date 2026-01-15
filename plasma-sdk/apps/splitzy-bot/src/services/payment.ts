/**
 * Payment Service
 * 
 * Handles payment intent creation and management.
 * Payment intents are the link between QR codes and actual payments.
 * 
 * SPLITZY-001: Migrated to use @plasma-pay/db for persistence
 */

import { nanoid } from 'nanoid';
import { prisma } from '@plasma-pay/db';
import type { PaymentIntent, ActiveBill, BillParticipant } from '../types.js';
import { PAYMENT_INTENT_EXPIRY_MS } from '../types.js';

// ============================================================================
// TELEGRAM NOTIFICATION HELPER
// ============================================================================

/**
 * Send a notification to a Telegram user via the bot API
 * Used to notify bill creators when all payments are complete
 */
async function sendTelegramNotification(
  telegramUserId: string,
  message: string
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.warn('TELEGRAM_BOT_TOKEN not configured - skipping notification');
    return false;
  }
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramUserId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Telegram API error:', error);
      return false;
    }
    
    console.log(`Notification sent to Telegram user ${telegramUserId}`);
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

/**
 * Look up the Telegram user ID for a wallet address
 */
async function getTelegramUserIdForWallet(walletAddress: string): Promise<string | null> {
  try {
    const telegramWallet = await prisma.telegramWallet.findFirst({
      where: { walletAddress },
    });
    return telegramWallet?.telegramUserId || null;
  } catch (error) {
    console.error('Failed to look up Telegram wallet:', error);
    return null;
  }
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

/**
 * Initialize database connection
 * Should be called on bot startup
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

// ============================================================================
// PAYMENT INTENT OPERATIONS (Database-backed)
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
  // Create bill in database
  const dbBill = await prisma.bill.create({
    data: {
      creatorAddress: bill.creatorAddress || '',
      title: bill.title,
      subtotal: bill.subtotal,
      tax: bill.tax,
      taxPercent: bill.taxPercent,
      tip: bill.tip,
      tipPercent: bill.tipPercent,
      total: bill.total,
      currency: 'USDT0',
      status: 'active',
    },
  });
  
  const billId = dbBill.id;
  const expiresAt = new Date(Date.now() + PAYMENT_INTENT_EXPIRY_MS);
  
  // Create payment intent for each participant
  const paymentIntents: PaymentIntent[] = [];
  
  for (let index = 0; index < bill.participants.length; index++) {
    const participant = bill.participants[index];
    
    const dbIntent = await prisma.paymentIntent.create({
      data: {
        billId,
        participantIndex: index,
        amountUsd: participant.share,
        recipientAddress: bill.creatorAddress || '',
        status: 'pending',
        expiresAt,
      },
    });
    
    // Map database model to internal PaymentIntent type
    const intent: PaymentIntent = {
      id: dbIntent.id,
      billId: dbIntent.billId,
      participantIndex: dbIntent.participantIndex,
      amountUsd: dbIntent.amountUsd,
      recipientAddress: dbIntent.recipientAddress,
      status: dbIntent.status as PaymentIntent['status'],
      createdAt: dbIntent.createdAt,
      expiresAt: dbIntent.expiresAt,
      payerAddress: dbIntent.payerAddress || undefined,
      sourceChainId: dbIntent.sourceChainId || undefined,
      sourceToken: dbIntent.sourceToken || undefined,
      sourceTxHash: dbIntent.sourceTxHash || undefined,
      destTxHash: dbIntent.destTxHash || undefined,
      bridgeProvider: dbIntent.bridgeProvider as PaymentIntent['bridgeProvider'],
      paidAt: dbIntent.paidAt || undefined,
    };
    
    paymentIntents.push(intent);
  }
  
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
  const dbIntent = await prisma.paymentIntent.findUnique({
    where: { id: intentId },
  });
  
  if (!dbIntent) {
    return null;
  }
  
  // Check if expired
  if (dbIntent.status === 'pending' && dbIntent.expiresAt < new Date()) {
    await prisma.paymentIntent.update({
      where: { id: intentId },
      data: { status: 'expired' },
    });
    return null;
  }
  
  // Map database model to internal PaymentIntent type
  return {
    id: dbIntent.id,
    billId: dbIntent.billId,
    participantIndex: dbIntent.participantIndex,
    amountUsd: dbIntent.amountUsd,
    recipientAddress: dbIntent.recipientAddress,
    status: dbIntent.status as PaymentIntent['status'],
    createdAt: dbIntent.createdAt,
    expiresAt: dbIntent.expiresAt,
    payerAddress: dbIntent.payerAddress || undefined,
    sourceChainId: dbIntent.sourceChainId || undefined,
    sourceToken: dbIntent.sourceToken || undefined,
    sourceTxHash: dbIntent.sourceTxHash || undefined,
    destTxHash: dbIntent.destTxHash || undefined,
    bridgeProvider: dbIntent.bridgeProvider as PaymentIntent['bridgeProvider'],
    paidAt: dbIntent.paidAt || undefined,
  };
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
  try {
    const dbIntent = await prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: updates.status,
        payerAddress: updates.payerAddress,
        sourceChainId: updates.sourceChainId,
        sourceToken: updates.sourceToken,
        sourceTxHash: updates.sourceTxHash,
        destTxHash: updates.destTxHash,
        bridgeProvider: updates.bridgeProvider,
        paidAt: updates.paidAt,
      },
    });
    
    // Map database model to internal PaymentIntent type
    return {
      id: dbIntent.id,
      billId: dbIntent.billId,
      participantIndex: dbIntent.participantIndex,
      amountUsd: dbIntent.amountUsd,
      recipientAddress: dbIntent.recipientAddress,
      status: dbIntent.status as PaymentIntent['status'],
      createdAt: dbIntent.createdAt,
      expiresAt: dbIntent.expiresAt,
      payerAddress: dbIntent.payerAddress || undefined,
      sourceChainId: dbIntent.sourceChainId || undefined,
      sourceToken: dbIntent.sourceToken || undefined,
      sourceTxHash: dbIntent.sourceTxHash || undefined,
      destTxHash: dbIntent.destTxHash || undefined,
      bridgeProvider: dbIntent.bridgeProvider as PaymentIntent['bridgeProvider'],
      paidAt: dbIntent.paidAt || undefined,
    };
  } catch (error) {
    // Handle record not found
    return null;
  }
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
  try {
    const dbIntent = await prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: 'completed',
        payerAddress: paymentDetails.payerAddress,
        sourceChainId: paymentDetails.sourceChainId,
        sourceToken: paymentDetails.sourceToken,
        sourceTxHash: paymentDetails.sourceTxHash,
        destTxHash: paymentDetails.destTxHash,
        bridgeProvider: paymentDetails.bridgeProvider,
        paidAt: new Date(),
      },
    });
    
    console.log(`Payment intent ${intentId} completed: ${paymentDetails.destTxHash}`);
    
    // Check if all participants have paid
    await checkBillCompletion(dbIntent.billId);
    
    // Map database model to internal PaymentIntent type
    return {
      id: dbIntent.id,
      billId: dbIntent.billId,
      participantIndex: dbIntent.participantIndex,
      amountUsd: dbIntent.amountUsd,
      recipientAddress: dbIntent.recipientAddress,
      status: dbIntent.status as PaymentIntent['status'],
      createdAt: dbIntent.createdAt,
      expiresAt: dbIntent.expiresAt,
      payerAddress: dbIntent.payerAddress || undefined,
      sourceChainId: dbIntent.sourceChainId || undefined,
      sourceToken: dbIntent.sourceToken || undefined,
      sourceTxHash: dbIntent.sourceTxHash || undefined,
      destTxHash: dbIntent.destTxHash || undefined,
      bridgeProvider: dbIntent.bridgeProvider as PaymentIntent['bridgeProvider'],
      paidAt: dbIntent.paidAt || undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Gets all payment intents for a bill
 * 
 * @param billId - Bill ID
 * @returns Array of payment intents
 */
export async function getPaymentIntentsForBill(billId: string): Promise<PaymentIntent[]> {
  const dbIntents = await prisma.paymentIntent.findMany({
    where: { billId },
    orderBy: { participantIndex: 'asc' },
  });
  
  return dbIntents.map(dbIntent => ({
    id: dbIntent.id,
    billId: dbIntent.billId,
    participantIndex: dbIntent.participantIndex,
    amountUsd: dbIntent.amountUsd,
    recipientAddress: dbIntent.recipientAddress,
    status: dbIntent.status as PaymentIntent['status'],
    createdAt: dbIntent.createdAt,
    expiresAt: dbIntent.expiresAt,
    payerAddress: dbIntent.payerAddress || undefined,
    sourceChainId: dbIntent.sourceChainId || undefined,
    sourceToken: dbIntent.sourceToken || undefined,
    sourceTxHash: dbIntent.sourceTxHash || undefined,
    destTxHash: dbIntent.destTxHash || undefined,
    bridgeProvider: dbIntent.bridgeProvider as PaymentIntent['bridgeProvider'],
    paidAt: dbIntent.paidAt || undefined,
  }));
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
  const dbIntent = await prisma.paymentIntent.findUnique({
    where: { id: intentId },
  });
  
  if (!dbIntent) return null;
  
  const dbBill = await prisma.bill.findUnique({
    where: { id: dbIntent.billId },
    include: {
      items: true,
      participants: true,
      paymentIntents: true,
    },
  });
  
  if (!dbBill) return null;
  
  // Map database bill to ActiveBill type
  const bill: ActiveBill = {
    title: dbBill.title,
    items: dbBill.items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
    participants: dbBill.participants.map(p => ({
      id: p.id,
      name: p.name,
      telegramUsername: undefined, // Not stored in current schema
      telegramUserId: undefined,
      assignedItemIds: [], // Would need to fetch assignments
      share: p.share,
      color: p.color,
    })),
    taxPercent: dbBill.taxPercent,
    tipPercent: dbBill.tipPercent,
    subtotal: dbBill.subtotal,
    tax: dbBill.tax,
    tip: dbBill.tip,
    total: dbBill.total,
    creatorAddress: dbBill.creatorAddress,
  };
  
  // Map payment intents
  const paymentIntents = dbBill.paymentIntents.map(pi => ({
    id: pi.id,
    billId: pi.billId,
    participantIndex: pi.participantIndex,
    amountUsd: pi.amountUsd,
    recipientAddress: pi.recipientAddress,
    status: pi.status as PaymentIntent['status'],
    createdAt: pi.createdAt,
    expiresAt: pi.expiresAt,
    payerAddress: pi.payerAddress || undefined,
    sourceChainId: pi.sourceChainId || undefined,
    sourceToken: pi.sourceToken || undefined,
    sourceTxHash: pi.sourceTxHash || undefined,
    destTxHash: pi.destTxHash || undefined,
    bridgeProvider: pi.bridgeProvider as PaymentIntent['bridgeProvider'],
    paidAt: pi.paidAt || undefined,
  }));
  
  return {
    bill,
    creatorTelegramId: '', // Not stored in current schema - would need to add
    paymentIntents,
  };
}

/**
 * Checks if all participants have paid and updates bill status
 * 
 * @param billId - Bill ID to check
 */
async function checkBillCompletion(billId: string): Promise<void> {
  const intents = await prisma.paymentIntent.findMany({
    where: { billId },
  });
  
  if (intents.length === 0) return;
  
  const allPaid = intents.every(intent => intent.status === 'completed');
  
  if (allPaid) {
    // Update bill status to completed and fetch bill details
    const bill = await prisma.bill.update({
      where: { id: billId },
      data: { status: 'completed' },
      include: { participants: true },
    });
    
    console.log(`Bill ${billId} fully paid!`);
    
    // Send notification to bill creator via Telegram
    const telegramUserId = await getTelegramUserIdForWallet(bill.creatorAddress);
    if (telegramUserId) {
      const participantCount = bill.participants.length;
      const totalAmount = bill.total.toFixed(2);
      const message = 
        `🎉 *Bill Fully Paid!*\n\n` +
        `"${bill.title}" is complete!\n\n` +
        `💰 Total: $${totalAmount}\n` +
        `👥 Participants: ${participantCount}\n\n` +
        `✅ All payments have been received!`;
      
      await sendTelegramNotification(telegramUserId, message);
    }
  }
}

/**
 * Cleans up expired payment intents
 * Should be called periodically
 */
export async function cleanupExpiredIntents(): Promise<number> {
  const result = await prisma.paymentIntent.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });
  
  console.log(`Cleaned up ${result.count} expired payment intents`);
  return result.count;
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Gets statistics about payment intents
 */
export async function getStats(): Promise<{
  totalIntents: number;
  pendingIntents: number;
  completedIntents: number;
  totalBills: number;
}> {
  const [totalIntents, pendingIntents, completedIntents, totalBills] = await Promise.all([
    prisma.paymentIntent.count(),
    prisma.paymentIntent.count({ where: { status: 'pending' } }),
    prisma.paymentIntent.count({ where: { status: 'completed' } }),
    prisma.bill.count(),
  ]);
  
  return {
    totalIntents,
    pendingIntents,
    completedIntents,
    totalBills,
  };
}

// ============================================================================
// USER BILL HISTORY (SPLITZY-003)
// ============================================================================

/**
 * Summary of a bill for history display
 */
export interface BillHistorySummary {
  id: string;
  name: string;
  total: number;
  participantCount: number;
  paidCount: number;
  createdAt: Date;
  isCreator: boolean;
}

/**
 * Gets a user's bill history by Telegram ID
 * Returns bills where the user was either the creator or a participant
 * 
 * @param telegramId - Telegram user ID as string
 * @param limit - Maximum number of bills to return (default 10)
 * @returns Array of bill summaries
 */
export async function getUserBillHistory(telegramId: string, limit = 10): Promise<BillHistorySummary[]> {
  try {
    // First, get the user's wallet address from their telegram ID
    const telegramWallet = await prisma.telegramWallet.findUnique({
      where: { telegramUserId: telegramId },
    });

    if (!telegramWallet) {
      console.log(`No wallet found for telegram user ${telegramId}`);
      return [];
    }

    const walletAddress = telegramWallet.walletAddress;

    // Find bills where user is creator OR is a participant
    const bills = await prisma.bill.findMany({
      where: {
        OR: [
          { creatorAddress: walletAddress },
          { 
            participants: { 
              some: { 
                // Match by email or other identifier if available
                // For now, we match by creator address as a proxy
              } 
            } 
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        participants: {
          select: {
            id: true,
            paid: true,
          },
        },
        paymentIntents: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return bills.map((bill) => {
      // Count paid participants using payment intents status
      const paidCount = bill.paymentIntents.filter((pi) => pi.status === 'completed').length;
      
      return {
        id: bill.id,
        name: bill.title,
        total: bill.total,
        participantCount: bill.participants.length || bill.paymentIntents.length,
        paidCount,
        createdAt: bill.createdAt,
        isCreator: bill.creatorAddress === walletAddress,
      };
    });
  } catch (error) {
    console.error('Failed to fetch bill history:', error);
    return [];
  }
}

