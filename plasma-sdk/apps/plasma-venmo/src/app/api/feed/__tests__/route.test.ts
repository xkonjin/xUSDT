/**
 * Feed API Route Tests
 * VENMO-006: Implement Real Social Feed
 * 
 * Requirements:
 * - GET /api/feed queries recent activities from database
 * - Supports pagination (limit, offset)
 * - Filters by privacy settings
 * - Returns formatted feed items
 */

// Mock @plasma-pay/db with hoisted mock
jest.mock('@plasma-pay/db', () => {
  return {
    prisma: {
      activity: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    },
  };
});

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      status: init.status || 200,
      json: async () => data,
    })),
  },
}));

// Import after mocking
import { GET, POST } from '../route';
import { prisma } from '@plasma-pay/db';

// Cast to mocked type
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('GET /api/feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    return new Request(`http://localhost:3002/api/feed?${searchParams.toString()}`);
  };

  describe('basic feed retrieval', () => {
    it('returns public activities by default', async () => {
      const mockActivities = [
        {
          id: 'activity-1',
          type: 'payment',
          actorAddress: '0x1234',
          actorName: 'Alice',
          targetAddress: '0x5678',
          targetName: 'Bob',
          amount: 50.0,
          currency: 'USDT0',
          memo: 'Lunch',
          visibility: 'public',
          txHash: '0xabc',
          likes: 5,
          createdAt: new Date('2024-01-01T12:00:00Z'),
        },
        {
          id: 'activity-2',
          type: 'payment',
          actorAddress: '0x9abc',
          actorName: 'Charlie',
          targetAddress: '0xdef0',
          targetName: 'Diana',
          amount: 25.0,
          currency: 'USDT0',
          memo: 'Coffee',
          visibility: 'public',
          txHash: '0xdef',
          likes: 2,
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue(mockActivities);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(2);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.feed).toHaveLength(2);
      expect(data.feed[0].id).toBe('activity-1');
      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibility: 'public' },
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('returns empty feed when no activities', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.feed).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });
  });

  describe('pagination', () => {
    it('supports limit parameter', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({ limit: '5' });
      await GET(request);

      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('supports offset parameter', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({ offset: '10' });
      await GET(request);

      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
        })
      );
    });

    it('uses default limit of 20', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest();
      await GET(request);

      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });

    it('uses default offset of 0', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest();
      await GET(request);

      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        })
      );
    });

    it('returns pagination metadata', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(50);

      const request = createMockRequest({ limit: '10', offset: '20' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toEqual({
        limit: 10,
        offset: 20,
        total: 50,
        hasMore: true,
      });
    });

    it('correctly calculates hasMore when at end', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([
        {
          id: '1',
          type: 'payment',
          actorAddress: '0x1234',
          actorName: 'Alice',
          targetAddress: '0x5678',
          targetName: 'Bob',
          amount: 10.0,
          currency: 'USDT0',
          memo: null,
          visibility: 'public',
          txHash: null,
          likes: 0,
          createdAt: new Date(),
        },
        {
          id: '2',
          type: 'payment',
          actorAddress: '0x9abc',
          actorName: 'Charlie',
          targetAddress: '0xdef0',
          targetName: 'Diana',
          amount: 20.0,
          currency: 'USDT0',
          memo: null,
          visibility: 'public',
          txHash: null,
          likes: 0,
          createdAt: new Date(),
        },
      ]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(12);

      const request = createMockRequest({ limit: '10', offset: '10' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.hasMore).toBe(false);
    });
  });

  describe('privacy filtering', () => {
    it('filters by visibility when address provided', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({ address: userAddress });
      await GET(request);

      // When address is provided, show public + user's own activities
      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { visibility: 'public' },
              { actorAddress: userAddress },
              { targetAddress: userAddress },
            ],
          },
        })
      );
    });

    it('only shows public activities for unauthenticated requests', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest();
      await GET(request);

      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { visibility: 'public' },
        })
      );
    });
  });

  describe('response format', () => {
    it('formats activity items correctly', async () => {
      const mockActivity = {
        id: 'activity-1',
        type: 'payment',
        actorAddress: '0x1234',
        actorName: 'Alice',
        targetAddress: '0x5678',
        targetName: 'Bob',
        amount: 50.0,
        currency: 'USDT0',
        memo: 'Lunch',
        visibility: 'public',
        txHash: '0xabc',
        likes: 5,
        createdAt: new Date('2024-01-01T12:00:00Z'),
      };

      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([mockActivity]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(1);

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      const feedItem = data.feed[0];
      expect(feedItem).toEqual({
        id: 'activity-1',
        type: 'payment',
        user: {
          name: 'Alice',
          address: '0x1234',
        },
        counterparty: {
          name: 'Bob',
          address: '0x5678',
        },
        amount: '50.00',
        memo: 'Lunch',
        timestamp: expect.any(Number),
        likes: 5,
        isLiked: false,
        visibility: 'public',
      });
    });
  });

  describe('error handling', () => {
    it('handles database errors gracefully', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch feed');
    });

    it('validates limit parameter', async () => {
      const request = createMockRequest({ limit: '-5' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit');
    });

    it('validates offset parameter', async () => {
      const request = createMockRequest({ offset: '-10' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid offset');
    });

    it('caps limit at 100', async () => {
      (mockedPrisma.activity.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.activity.count as jest.Mock).mockResolvedValue(0);

      const request = createMockRequest({ limit: '500' });
      await GET(request);

      expect(mockedPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });
});

describe('POST /api/feed (like/unlike)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createPostRequest = (body: object) => {
    return new Request('http://localhost:3002/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  describe('like functionality', () => {
    it('returns error when activityId is missing', async () => {
      const request = createPostRequest({ userAddress: '0x1234' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('activityId and userAddress are required');
    });

    it('returns error when userAddress is missing', async () => {
      const request = createPostRequest({ activityId: 'activity-1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('activityId and userAddress are required');
    });

    it('returns 404 when activity not found', async () => {
      (mockedPrisma.activity.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createPostRequest({
        activityId: 'nonexistent',
        userAddress: '0x1234',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Activity not found');
    });

    it('successfully likes an activity', async () => {
      const mockActivity = {
        id: 'activity-1',
        likes: 5,
      };

      (mockedPrisma.activity.findUnique as jest.Mock).mockResolvedValue(mockActivity);
      (mockedPrisma.activity.update as jest.Mock).mockResolvedValue({ likes: 6 });

      const request = createPostRequest({
        activityId: 'activity-1',
        userAddress: '0x1234567890123456789012345678901234567890',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isLiked).toBe(true);
      expect(data.likes).toBe(6);
    });

    it('toggles like to unlike on second call', async () => {
      const mockActivity = { id: 'activity-1', likes: 6 };
      (mockedPrisma.activity.findUnique as jest.Mock).mockResolvedValue(mockActivity);
      (mockedPrisma.activity.update as jest.Mock).mockResolvedValue({ likes: 5 });

      // First call - like
      const request1 = createPostRequest({
        activityId: 'activity-1',
        userAddress: '0xabcdef1234567890123456789012345678901234',
      });
      const response1 = await POST(request1);
      const data1 = await response1.json();
      expect(data1.isLiked).toBe(true);

      // Second call - unlike (same user, same activity)
      const request2 = createPostRequest({
        activityId: 'activity-1',
        userAddress: '0xabcdef1234567890123456789012345678901234',
      });
      const response2 = await POST(request2);
      const data2 = await response2.json();
      expect(data2.isLiked).toBe(false);
    });

    it('handles database errors gracefully', async () => {
      (mockedPrisma.activity.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = createPostRequest({
        activityId: 'activity-1',
        userAddress: '0x1234',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process like');
    });
  });
});
