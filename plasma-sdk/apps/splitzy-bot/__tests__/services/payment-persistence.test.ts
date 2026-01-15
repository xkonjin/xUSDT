/**
 * Tests for Payment Persistence Service
 * 
 * SPLITZY-001: Migrate payment intents to database
 * - Replace in-memory Map with Prisma PaymentIntent model
 * - Implement CRUD operations
 * - Add cleanup for expired intents
 */

import { prisma } from '@plasma-pay/db';
import type { ActiveBill } from '../../src/types';

// Import functions to test (will be implemented)
import {
  createPaymentIntents,
  getPaymentIntent,
  updatePaymentIntent,
  completePaymentIntent,
  getPaymentIntentsForBill,
  cleanupExpiredIntents,
  initializeDatabase,
} from '../../src/services/payment';

// Mock prisma methods
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Payment Persistence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntents', () => {
    const mockBill: ActiveBill = {
      title: 'Test Restaurant',
      items: [
        { id: '1', name: 'Burger', price: 15, quantity: 1 },
        { id: '2', name: 'Fries', price: 5, quantity: 1 },
      ],
      participants: [
        { id: 'p1', name: 'Alice', assignedItemIds: ['1'], share: 10, color: '#00d4ff' },
        { id: 'p2', name: 'Bob', assignedItemIds: ['2'], share: 10, color: '#ff6b6b' },
      ],
      taxPercent: 0,
      tipPercent: 0,
      subtotal: 20,
      tax: 0,
      tip: 0,
      total: 20,
      creatorAddress: '0x1234567890123456789012345678901234567890',
    };

    it('should create a bill in the database', async () => {
      const mockCreatedBill = {
        id: 'bill-123',
        creatorAddress: mockBill.creatorAddress,
        title: mockBill.title,
        subtotal: mockBill.subtotal,
        tax: mockBill.tax,
        taxPercent: mockBill.taxPercent,
        tip: mockBill.tip,
        tipPercent: mockBill.tipPercent,
        total: mockBill.total,
        currency: 'USDT0',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.bill.create as jest.Mock).mockResolvedValue(mockCreatedBill);
      (mockPrisma.paymentIntent.create as jest.Mock).mockResolvedValue({
        id: 'intent-1',
        billId: 'bill-123',
        participantIndex: 0,
        amountUsd: 10,
        recipientAddress: mockBill.creatorAddress,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const intents = await createPaymentIntents(mockBill, 'telegram-123');

      expect(mockPrisma.bill.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          creatorAddress: mockBill.creatorAddress,
          title: mockBill.title,
          total: mockBill.total,
        }),
      });
    });

    it('should create payment intents for each participant', async () => {
      const mockCreatedBill = { id: 'bill-123' };
      (mockPrisma.bill.create as jest.Mock).mockResolvedValue(mockCreatedBill);
      (mockPrisma.paymentIntent.create as jest.Mock).mockImplementation(({ data }) => 
        Promise.resolve({
          id: `intent-${data.participantIndex}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      const intents = await createPaymentIntents(mockBill, 'telegram-123');

      expect(mockPrisma.paymentIntent.create).toHaveBeenCalledTimes(2);
      expect(intents).toHaveLength(2);
      expect(intents[0].amountUsd).toBe(10);
      expect(intents[1].amountUsd).toBe(10);
    });

    it('should set correct expiration time for intents', async () => {
      const mockCreatedBill = { id: 'bill-123' };
      (mockPrisma.bill.create as jest.Mock).mockResolvedValue(mockCreatedBill);
      (mockPrisma.paymentIntent.create as jest.Mock).mockImplementation(({ data }) => 
        Promise.resolve({ id: 'intent-1', ...data })
      );

      await createPaymentIntents(mockBill, 'telegram-123');

      const createCall = (mockPrisma.paymentIntent.create as jest.Mock).mock.calls[0][0];
      const expiresAt = new Date(createCall.data.expiresAt);
      const now = new Date();
      
      // Should expire in ~24 hours
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThan(25);
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve intent from database by ID', async () => {
      const mockIntent = {
        id: 'intent-123',
        billId: 'bill-456',
        participantIndex: 0,
        amountUsd: 25.50,
        recipientAddress: '0x1234',
        status: 'pending',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        createdAt: new Date(),
      };

      (mockPrisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(mockIntent);

      const result = await getPaymentIntent('intent-123');

      expect(mockPrisma.paymentIntent.findUnique).toHaveBeenCalledWith({
        where: { id: 'intent-123' },
      });
      expect(result).toEqual(mockIntent);
    });

    it('should return null for non-existent intent', async () => {
      (mockPrisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getPaymentIntent('non-existent');

      expect(result).toBeNull();
    });

    it('should return null and mark expired intents', async () => {
      const expiredIntent = {
        id: 'intent-123',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000), // Already expired
      };

      (mockPrisma.paymentIntent.findUnique as jest.Mock).mockResolvedValue(expiredIntent);
      (mockPrisma.paymentIntent.update as jest.Mock).mockResolvedValue({
        ...expiredIntent,
        status: 'expired',
      });

      const result = await getPaymentIntent('intent-123');

      expect(result).toBeNull();
      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: 'intent-123' },
        data: { status: 'expired' },
      });
    });
  });

  describe('updatePaymentIntent', () => {
    it('should update intent fields in database', async () => {
      const updatedIntent = {
        id: 'intent-123',
        status: 'processing',
        sourceChainId: 1,
        payerAddress: '0xpayer',
      };

      (mockPrisma.paymentIntent.update as jest.Mock).mockResolvedValue(updatedIntent);

      const result = await updatePaymentIntent('intent-123', {
        status: 'processing',
        sourceChainId: 1,
        payerAddress: '0xpayer',
      });

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: 'intent-123' },
        data: expect.objectContaining({
          status: 'processing',
          sourceChainId: 1,
          payerAddress: '0xpayer',
        }),
      });
      expect(result?.status).toBe('processing');
    });

    it('should return null for non-existent intent', async () => {
      (mockPrisma.paymentIntent.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      const result = await updatePaymentIntent('non-existent', { status: 'processing' });

      expect(result).toBeNull();
    });
  });

  describe('completePaymentIntent', () => {
    it('should mark intent as completed with payment details', async () => {
      const completedIntent = {
        id: 'intent-123',
        billId: 'bill-456',
        participantIndex: 0,
        amountUsd: 25.0,
        recipientAddress: '0xrecipient',
        status: 'completed',
        payerAddress: '0xpayer',
        destTxHash: '0xtxhash',
        sourceTxHash: null,
        sourceChainId: null,
        sourceToken: null,
        bridgeProvider: null,
        paidAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };

      (mockPrisma.paymentIntent.update as jest.Mock).mockResolvedValue(completedIntent);
      // Also mock findMany for checkBillCompletion
      (mockPrisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([completedIntent]);

      const result = await completePaymentIntent('intent-123', {
        payerAddress: '0xpayer',
        destTxHash: '0xtxhash',
      });

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: 'intent-123' },
        data: expect.objectContaining({
          status: 'completed',
          payerAddress: '0xpayer',
          destTxHash: '0xtxhash',
          paidAt: expect.any(Date),
        }),
      });
      expect(result?.status).toBe('completed');
    });

    it('should store bridge provider info when used', async () => {
      const intentWithBridge = {
        id: 'intent-123',
        billId: 'bill-456',
        participantIndex: 0,
        amountUsd: 25.0,
        recipientAddress: '0xrecipient',
        status: 'completed',
        payerAddress: '0xpayer',
        destTxHash: '0xtxhash',
        sourceTxHash: '0xsourcetx',
        sourceChainId: 1,
        sourceToken: '0xusdc',
        bridgeProvider: 'jumper',
        paidAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };
      (mockPrisma.paymentIntent.update as jest.Mock).mockResolvedValue(intentWithBridge);
      (mockPrisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([intentWithBridge]);

      await completePaymentIntent('intent-123', {
        payerAddress: '0xpayer',
        destTxHash: '0xtxhash',
        sourceChainId: 1,
        sourceToken: '0xusdc',
        sourceTxHash: '0xsourcetx',
        bridgeProvider: 'jumper',
      });

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: 'intent-123' },
        data: expect.objectContaining({
          bridgeProvider: 'jumper',
          sourceChainId: 1,
          sourceToken: '0xusdc',
          sourceTxHash: '0xsourcetx',
        }),
      });
    });
  });

  describe('getPaymentIntentsForBill', () => {
    it('should retrieve all intents for a bill', async () => {
      const mockIntents = [
        { id: 'intent-1', billId: 'bill-123', participantIndex: 0 },
        { id: 'intent-2', billId: 'bill-123', participantIndex: 1 },
      ];

      (mockPrisma.paymentIntent.findMany as jest.Mock).mockResolvedValue(mockIntents);

      const result = await getPaymentIntentsForBill('bill-123');

      expect(mockPrisma.paymentIntent.findMany).toHaveBeenCalledWith({
        where: { billId: 'bill-123' },
        orderBy: { participantIndex: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-existent bill', async () => {
      (mockPrisma.paymentIntent.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getPaymentIntentsForBill('non-existent');

      expect(result).toEqual([]);
    });
  });

  describe('cleanupExpiredIntents', () => {
    it('should mark all expired pending intents as expired', async () => {
      (mockPrisma.paymentIntent.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredIntents();

      expect(mockPrisma.paymentIntent.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          expiresAt: { lt: expect.any(Date) },
        },
        data: { status: 'expired' },
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no intents expired', async () => {
      (mockPrisma.paymentIntent.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await cleanupExpiredIntents();

      expect(result).toBe(0);
    });
  });

  describe('initializeDatabase', () => {
    it('should connect to database on initialization', async () => {
      await initializeDatabase();

      expect(mockPrisma.$connect).toHaveBeenCalled();
    });
  });
});
