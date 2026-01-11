/**
 * Tests for Payment Status Service
 * 
 * SUB-002: Server-side payment verification
 * Replace localStorage with server-side payment status check
 * 
 * Tests the core business logic (getPaymentStatus function)
 * which is used by the /api/payment-status route handler.
 */

// Mock Prisma - must use jest.fn() inside the factory
jest.mock('@plasma-pay/db', () => ({
  prisma: {
    subKillerPayment: {
      findUnique: jest.fn(),
    },
  },
}));

// Import after mocking
import { getPaymentStatus } from '../../src/lib/payment-status';
import { prisma } from '@plasma-pay/db';

// Get reference to the mocked function
const mockFindUnique = prisma.subKillerPayment.findUnique as jest.Mock;

describe('Payment Status Service', () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentStatus', () => {
    it('should return hasPaid: false when wallet has not paid', async () => {
      mockFindUnique.mockResolvedValue(null);
      
      const result = await getPaymentStatus('0x1234567890123456789012345678901234567890');
      
      expect(result.hasPaid).toBe(false);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { walletAddress: '0x1234567890123456789012345678901234567890' },
      });
    });

    it('should return hasPaid: true with details when wallet has paid', async () => {
      const mockPayment = {
        id: 'test-id',
        walletAddress: '0x1234567890123456789012345678901234567890',
        email: 'test@example.com',
        amount: 0.99,
        txHash: '0xabcd1234',
        createdAt: new Date('2024-01-15T10:00:00Z'),
      };
      mockFindUnique.mockResolvedValue(mockPayment);
      
      const result = await getPaymentStatus('0x1234567890123456789012345678901234567890');
      
      expect(result.hasPaid).toBe(true);
      expect(result.txHash).toBe('0xabcd1234');
      expect(result.paidAt).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should handle mixed-case addresses by normalizing to lowercase', async () => {
      mockFindUnique.mockResolvedValue(null);
      
      await getPaymentStatus('0xAbCd1234567890123456789012345678901234567890');
      
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { walletAddress: '0xabcd1234567890123456789012345678901234567890' },
      });
    });

    it('should propagate database errors', async () => {
      mockFindUnique.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(getPaymentStatus('0x1234567890123456789012345678901234567890'))
        .rejects.toThrow('Database connection failed');
    });
  });
});
