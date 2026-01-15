/**
 * @plasma-pay/db
 * 
 * Database layer for Plasma SDK applications.
 * Provides Prisma-based data access for:
 * - Payment Links (shareable URLs for receiving payments)
 * - Payment Requests (request money from specific users)
 * - Claims (hold payments for unregistered recipients)
 * - Notifications (email/push notification tracking)
 * - Invoices (x402 payment invoices)
 * - Bills (bill splitting with participants and items)
 */

// Re-export the Prisma client singleton
export { prisma, default as db } from './client';

// Re-export Prisma types for use in other packages
export type {
  PaymentLink,
  PaymentRequest,
  Claim,
  Notification,
  Invoice,
  Bill,
  BillItem,
  BillParticipant,
  BillItemAssignment,
  Activity,
  Contact,
  UserSettings,
  Stream,
  GasSponsorshipLog,
} from '@prisma/client';

// Re-export Prisma namespace for advanced queries
export { Prisma } from '@prisma/client';

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Status types for various entities
 */
export type PaymentLinkStatus = 'active' | 'paid' | 'expired' | 'cancelled';
export type PaymentRequestStatus = 'pending' | 'paid' | 'declined' | 'expired';
export type ClaimStatus = 'pending' | 'claimed' | 'expired' | 'cancelled';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type InvoiceStatus = 'pending' | 'paid' | 'expired' | 'failed';
export type BillStatus = 'draft' | 'active' | 'completed';

/**
 * Notification types
 */
export type NotificationType =
  | 'payment_received'
  | 'payment_request'
  | 'claim_available'
  | 'payment_completed'
  | 'request_declined'
  | 'bill_created'
  | 'bill_share_assigned';

// ============================================================================
// DATA ACCESS HELPERS
// ============================================================================

import { prisma } from './client';
import crypto from 'crypto';

/**
 * Generate a secure random token for claims
 */
export function generateClaimToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a claim token for storage (we never store plain tokens)
 */
export function hashClaimToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Payment Link helpers
 */
export const paymentLinks = {
  /**
   * Create a new payment link
   */
  async create(data: {
    creatorAddress: string;
    creatorEmail?: string;
    amount?: number;
    memo?: string;
    expiresAt?: Date;
  }) {
    return prisma.paymentLink.create({
      data: {
        ...data,
        currency: 'USDT0',
        status: 'active',
      },
    });
  },

  /**
   * Get a payment link by ID
   */
  async getById(id: string) {
    return prisma.paymentLink.findUnique({ where: { id } });
  },

  /**
   * Get all payment links for a creator
   */
  async getByCreator(creatorAddress: string) {
    return prisma.paymentLink.findMany({
      where: { creatorAddress },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Mark a payment link as paid
   */
  async markPaid(id: string, paidBy: string, txHash: string) {
    return prisma.paymentLink.update({
      where: { id },
      data: {
        status: 'paid',
        paidBy,
        paidAt: new Date(),
        txHash,
      },
    });
  },

  /**
   * Expire old payment links
   */
  async expireOld() {
    return prisma.paymentLink.updateMany({
      where: {
        status: 'active',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });
  },
};

/**
 * Payment Request helpers
 */
export const paymentRequests = {
  /**
   * Create a new payment request
   */
  async create(data: {
    fromAddress: string;
    fromEmail?: string;
    toIdentifier: string;
    toAddress?: string;
    amount: number;
    memo?: string;
    expiresAt?: Date;
  }) {
    return prisma.paymentRequest.create({
      data: {
        ...data,
        currency: 'USDT0',
        status: 'pending',
        expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      },
    });
  },

  /**
   * Get requests sent by an address
   */
  async getSent(fromAddress: string) {
    return prisma.paymentRequest.findMany({
      where: { fromAddress },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get requests received by an address or identifier
   */
  async getReceived(addressOrIdentifier: string) {
    return prisma.paymentRequest.findMany({
      where: {
        OR: [
          { toAddress: addressOrIdentifier },
          { toIdentifier: addressOrIdentifier.toLowerCase() },
        ],
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Mark a request as paid
   */
  async markPaid(id: string, txHash: string) {
    return prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        txHash,
      },
    });
  },

  /**
   * Decline a request
   */
  async decline(id: string, reason?: string) {
    return prisma.paymentRequest.update({
      where: { id },
      data: {
        status: 'declined',
        declinedAt: new Date(),
        declineReason: reason,
      },
    });
  },
};

/**
 * Claim helpers
 */
export const claims = {
  /**
   * Create a new claim (returns the plain token - only chance to get it!)
   */
  async create(data: {
    senderAddress: string;
    senderEmail?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    authorization: object;
    amount: number;
    memo?: string;
    expiresAt?: Date;
  }) {
    const token = generateClaimToken();
    const tokenHash = hashClaimToken(token);

    const claim = await prisma.claim.create({
      data: {
        tokenHash,
        senderAddress: data.senderAddress,
        senderEmail: data.senderEmail,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        authorization: JSON.stringify(data.authorization),
        amount: data.amount,
        currency: 'USDT0',
        memo: data.memo,
        status: 'pending',
        expiresAt: data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      },
    });

    return { claim, token }; // Return plain token only on creation
  },

  /**
   * Get a claim by token (hashes the token first)
   */
  async getByToken(token: string) {
    const tokenHash = hashClaimToken(token);
    return prisma.claim.findUnique({ where: { tokenHash } });
  },

  /**
   * Mark a claim as claimed
   */
  async markClaimed(id: string, claimedBy: string, txHash: string) {
    return prisma.claim.update({
      where: { id },
      data: {
        status: 'claimed',
        claimedBy,
        claimedAt: new Date(),
        txHash,
      },
    });
  },
};

/**
 * Notification helpers
 */
export const notifications = {
  /**
   * Create a notification
   */
  async create(data: {
    recipientEmail?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: object;
    relatedType?: string;
    relatedId?: string;
  }) {
    return prisma.notification.create({
      data: {
        ...data,
        data: data.data ? JSON.stringify(data.data) : null,
        status: 'pending',
      },
    });
  },

  /**
   * Mark notification as sent
   */
  async markSent(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
    });
  },

  /**
   * Mark notification as failed
   */
  async markFailed(id: string, reason: string) {
    return prisma.notification.update({
      where: { id },
      data: { status: 'failed', failedAt: new Date(), failureReason: reason },
    });
  },

  /**
   * Get pending notifications
   */
  async getPending() {
    return prisma.notification.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
  },
};

/**
 * Invoice helpers
 */
export const invoices = {
  /**
   * Create an invoice
   */
  async create(data: {
    amount: number;
    description?: string;
    merchantAddress: string;
    paymentOptions: object;
    expiresAt?: Date;
  }) {
    return prisma.invoice.create({
      data: {
        ...data,
        currency: 'USDT0',
        paymentOptions: JSON.stringify(data.paymentOptions),
        status: 'pending',
        expiresAt: data.expiresAt || new Date(Date.now() + 10 * 60 * 1000), // 10 minutes default
      },
    });
  },

  /**
   * Get invoice by ID
   */
  async getById(id: string) {
    return prisma.invoice.findUnique({ where: { id } });
  },

  /**
   * Mark invoice as paid
   */
  async markPaid(id: string, paidBy: string, txHash: string, network: string) {
    return prisma.invoice.update({
      where: { id },
      data: {
        status: 'paid',
        paidBy,
        paidAt: new Date(),
        txHash,
        network,
      },
    });
  },
};

/**
 * Bill helpers
 */
export const bills = {
  /**
   * Create a new bill
   */
  async create(data: {
    creatorAddress: string;
    title: string;
    subtotal: number;
    tax?: number;
    taxPercent?: number;
    tip?: number;
    tipPercent?: number;
    total: number;
    receiptImageUrl?: string;
  }) {
    return prisma.bill.create({
      data: {
        ...data,
        currency: 'USDT0',
        status: 'draft',
      },
    });
  },

  /**
   * Get bill by ID with all relations
   */
  async getById(id: string) {
    return prisma.bill.findUnique({
      where: { id },
      include: {
        items: {
          include: { assignments: true },
        },
        participants: {
          include: { assignments: true },
        },
      },
    });
  },

  /**
   * Get all bills for a creator
   */
  async getByCreator(creatorAddress: string) {
    return prisma.bill.findMany({
      where: { creatorAddress },
      include: {
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Add a participant to a bill
   */
  async addParticipant(billId: string, data: {
    name: string;
    email?: string;
    phone?: string;
    color?: string;
  }) {
    return prisma.billParticipant.create({
      data: {
        billId,
        ...data,
      },
    });
  },

  /**
   * Add an item to a bill
   */
  async addItem(billId: string, data: {
    name: string;
    price: number;
    quantity?: number;
  }) {
    return prisma.billItem.create({
      data: {
        billId,
        ...data,
      },
    });
  },

  /**
   * Assign an item to a participant
   */
  async assignItem(itemId: string, participantId: string) {
    return prisma.billItemAssignment.create({
      data: { itemId, participantId },
    });
  },

  /**
   * Mark a participant as paid
   */
  async markParticipantPaid(participantId: string, txHash: string) {
    return prisma.billParticipant.update({
      where: { id: participantId },
      data: {
        paid: true,
        paidAt: new Date(),
        txHash,
      },
    });
  },
};

