/**
 * Activity/Feed API Tests
 * VENMO-006: Implement Real Social Feed
 * 
 * Requirements:
 * - Activity model for storing feed items
 * - GET /api/feed endpoint with pagination and privacy filtering
 * - Activity logging on payments (transfers, claims, requests)
 */

import { createActivity, ActivityType, ActivityVisibility, type CreateActivityInput } from '../activity';
import { prisma } from '@plasma-pay/db';

// Mock prisma
jest.mock('@plasma-pay/db', () => ({
  prisma: {
    activity: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Activity Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createActivity', () => {
    it('creates a payment activity with required fields', async () => {
      const input: CreateActivityInput = {
        type: 'payment',
        actorAddress: '0x1234567890123456789012345678901234567890',
        actorName: 'Alice',
        targetAddress: '0x0987654321098765432109876543210987654321',
        targetName: 'Bob',
        amount: 50.00,
        memo: 'Lunch',
        visibility: 'public',
      };

      const expectedActivity = {
        id: 'activity-1',
        ...input,
        currency: 'USDT0',
        txHash: null,
        likes: 0,
        createdAt: new Date(),
      };

      (mockPrisma.activity.create as jest.Mock).mockResolvedValue(expectedActivity);

      const result = await createActivity(input);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith({
        data: {
          type: input.type,
          actorAddress: input.actorAddress,
          actorName: input.actorName,
          targetAddress: input.targetAddress,
          targetName: input.targetName,
          amount: input.amount,
          currency: 'USDT0',
          memo: input.memo,
          visibility: input.visibility,
          txHash: undefined,
        },
      });
      expect(result).toEqual(expectedActivity);
    });

    it('creates a claim activity', async () => {
      const input: CreateActivityInput = {
        type: 'claim',
        actorAddress: '0x1234567890123456789012345678901234567890',
        actorName: 'Alice',
        targetAddress: '0x0987654321098765432109876543210987654321',
        targetName: 'Bob',
        amount: 25.00,
        txHash: '0xabc123',
        visibility: 'friends',
      };

      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({
        id: 'activity-2',
        ...input,
        currency: 'USDT0',
        likes: 0,
        createdAt: new Date(),
      });

      const result = await createActivity(input);

      expect(mockPrisma.activity.create).toHaveBeenCalled();
      expect(result.type).toBe('claim');
      expect(result.txHash).toBe('0xabc123');
    });

    it('creates a request activity', async () => {
      const input: CreateActivityInput = {
        type: 'request',
        actorAddress: '0x1234567890123456789012345678901234567890',
        actorName: 'Alice',
        targetAddress: '0x0987654321098765432109876543210987654321',
        targetName: 'Bob',
        amount: 100.00,
        memo: 'Rent share',
        visibility: 'private',
      };

      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({
        id: 'activity-3',
        ...input,
        currency: 'USDT0',
        likes: 0,
        createdAt: new Date(),
      });

      const result = await createActivity(input);

      expect(result.type).toBe('request');
      expect(result.visibility).toBe('private');
    });

    it('handles missing optional fields', async () => {
      const input: CreateActivityInput = {
        type: 'payment',
        actorAddress: '0x1234567890123456789012345678901234567890',
        actorName: 'Alice',
        targetAddress: '0x0987654321098765432109876543210987654321',
        targetName: 'Bob',
        amount: 10.00,
        visibility: 'public',
      };

      (mockPrisma.activity.create as jest.Mock).mockResolvedValue({
        id: 'activity-4',
        ...input,
        currency: 'USDT0',
        memo: null,
        txHash: null,
        likes: 0,
        createdAt: new Date(),
      });

      const result = await createActivity(input);

      expect(result.memo).toBeNull();
      expect(result.txHash).toBeNull();
    });
  });

  describe('Activity types', () => {
    it('has correct ActivityType values', () => {
      expect(ActivityType.PAYMENT).toBe('payment');
      expect(ActivityType.CLAIM).toBe('claim');
      expect(ActivityType.REQUEST).toBe('request');
    });

    it('has correct ActivityVisibility values', () => {
      expect(ActivityVisibility.PUBLIC).toBe('public');
      expect(ActivityVisibility.FRIENDS).toBe('friends');
      expect(ActivityVisibility.PRIVATE).toBe('private');
    });
  });
});
