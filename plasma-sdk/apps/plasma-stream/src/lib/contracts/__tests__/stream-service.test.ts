/**
 * Stream Contract Service Tests
 *
 * Tests for the contract abstraction layer that enables
 * easy swapping between mock (database) and real contract implementations.
 */

import { getStreamService, StreamService, CreateStreamParams, Stream } from '../stream-service';

// Mock the prisma client
jest.mock('@plasma-pay/db', () => ({
  prisma: {
    stream: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '@plasma-pay/db';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('StreamService', () => {
  let service: StreamService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete process.env.STREAM_CONTRACT_ADDRESS;
    service = getStreamService();
  });

  describe('getStreamService', () => {
    it('returns MockStreamService when no contract address is set', () => {
      const svc = getStreamService();
      expect(svc.getServiceType()).toBe('mock');
    });

    it('returns MockStreamService when contract address is empty', () => {
      process.env.STREAM_CONTRACT_ADDRESS = '';
      const svc = getStreamService();
      expect(svc.getServiceType()).toBe('mock');
    });

    // TODO: Enable when real contract service is implemented
    // it('returns ContractStreamService when contract address is set', () => {
    //   process.env.STREAM_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    //   const svc = getStreamService();
    //   expect(svc.getServiceType()).toBe('contract');
    // });
  });

  describe('MockStreamService.createStream', () => {
    const validParams: CreateStreamParams = {
      sender: '0x1234567890123456789012345678901234567890',
      recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      depositAmount: '1000000000', // 1000 USDT
      duration: 86400, // 1 day
      cliffDuration: 3600, // 1 hour
      cancelable: true,
    };

    it('creates a stream with valid parameters', async () => {
      const mockStream = {
        id: 'stream-123',
        sender: validParams.sender.toLowerCase(),
        recipient: validParams.recipient.toLowerCase(),
        depositAmount: validParams.depositAmount,
        withdrawnAmount: '0',
        startTime: 1000,
        endTime: 1000 + validParams.duration,
        cliffTime: 1000 + validParams.cliffDuration!,
        cliffAmount: '41666666', // proportional cliff amount
        ratePerSecond: '11574',
        cancelable: true,
        active: true,
      };

      (mockPrisma.stream.create as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.createStream(validParams);

      expect(result.success).toBe(true);
      expect(result.streamId).toBe('stream-123');
      expect(result.stream).toBeDefined();
      expect(mockPrisma.stream.create).toHaveBeenCalledTimes(1);
    });

    it('handles default cliff duration of 0', async () => {
      const paramsNoCliff = { ...validParams, cliffDuration: undefined };
      const mockStream = {
        id: 'stream-456',
        sender: paramsNoCliff.sender.toLowerCase(),
        recipient: paramsNoCliff.recipient.toLowerCase(),
        depositAmount: paramsNoCliff.depositAmount,
        withdrawnAmount: '0',
        startTime: 1000,
        endTime: 1000 + paramsNoCliff.duration,
        cliffTime: 1000,
        cliffAmount: '0',
        ratePerSecond: '11574',
        cancelable: true,
        active: true,
      };

      (mockPrisma.stream.create as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.createStream(paramsNoCliff);

      expect(result.success).toBe(true);
    });

    it('handles database errors gracefully', async () => {
      (mockPrisma.stream.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await service.createStream(validParams);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('MockStreamService.withdraw', () => {
    const streamId = 'stream-123';
    const recipientAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    it('withdraws available funds from an active stream', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockStream = {
        id: streamId,
        sender: '0x1234567890123456789012345678901234567890',
        recipient: recipientAddress.toLowerCase(),
        depositAmount: '1000000000',
        withdrawnAmount: '0',
        startTime: now - 3600, // Started 1 hour ago
        endTime: now + 82800, // 23 hours remaining
        cliffTime: now - 1800, // Cliff was 30 min ago
        cliffAmount: '41666666',
        ratePerSecond: '11574',
        cancelable: true,
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);
      (mockPrisma.stream.update as jest.Mock).mockResolvedValue({
        ...mockStream,
        withdrawnAmount: '41666666',
      });

      const result = await service.withdraw(streamId, recipientAddress);

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.amount).toBeDefined();
    });

    it('returns error for non-existent stream', async () => {
      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.withdraw(streamId, recipientAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stream not found');
    });

    it('returns error when caller is not recipient', async () => {
      const mockStream = {
        id: streamId,
        recipient: '0x9999999999999999999999999999999999999999',
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.withdraw(streamId, recipientAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the recipient can withdraw');
    });

    it('returns error when stream is not active', async () => {
      const mockStream = {
        id: streamId,
        recipient: recipientAddress.toLowerCase(),
        active: false,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.withdraw(streamId, recipientAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stream is not active');
    });
  });

  describe('MockStreamService.cancel', () => {
    const streamId = 'stream-123';
    const senderAddress = '0x1234567890123456789012345678901234567890';

    it('cancels an active cancelable stream', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockStream = {
        id: streamId,
        sender: senderAddress.toLowerCase(),
        recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        depositAmount: '1000000000',
        withdrawnAmount: '0',
        startTime: now - 3600,
        endTime: now + 82800,
        cliffTime: now - 1800,
        cliffAmount: '41666666',
        ratePerSecond: '11574',
        cancelable: true,
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);
      (mockPrisma.stream.update as jest.Mock).mockResolvedValue({
        ...mockStream,
        active: false,
      });

      const result = await service.cancel(streamId, senderAddress);

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.details).toBeDefined();
    });

    it('returns error for non-existent stream', async () => {
      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.cancel(streamId, senderAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stream not found');
    });

    it('returns error when caller is not sender', async () => {
      const mockStream = {
        id: streamId,
        sender: '0x9999999999999999999999999999999999999999',
        cancelable: true,
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.cancel(streamId, senderAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the sender can cancel');
    });

    it('returns error when stream is not cancelable', async () => {
      const mockStream = {
        id: streamId,
        sender: senderAddress.toLowerCase(),
        cancelable: false,
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.cancel(streamId, senderAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('This stream is not cancelable');
    });

    it('returns error when stream is not active', async () => {
      const mockStream = {
        id: streamId,
        sender: senderAddress.toLowerCase(),
        cancelable: true,
        active: false,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.cancel(streamId, senderAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stream is already inactive');
    });
  });

  describe('MockStreamService.getStream', () => {
    const streamId = 'stream-123';

    it('returns stream by ID', async () => {
      const mockStream = {
        id: streamId,
        sender: '0x1234567890123456789012345678901234567890',
        recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        depositAmount: '1000000000',
        withdrawnAmount: '0',
        startTime: 1000,
        endTime: 87400,
        cliffTime: 4600,
        cliffAmount: '41666666',
        ratePerSecond: '11574',
        cancelable: true,
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.getStream(streamId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(streamId);
    });

    it('returns null for non-existent stream', async () => {
      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getStream(streamId);

      expect(result).toBeNull();
    });
  });

  describe('MockStreamService.getStreamsByAddress', () => {
    const address = '0x1234567890123456789012345678901234567890';

    it('returns sending streams for address', async () => {
      const mockStreams = [
        {
          id: 'stream-1',
          sender: address.toLowerCase(),
          recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          depositAmount: '1000000000',
          withdrawnAmount: '0',
          active: true,
        },
      ];

      (mockPrisma.stream.findMany as jest.Mock).mockResolvedValue(mockStreams);

      const result = await service.getStreamsByAddress(address, 'sending');

      expect(result).toHaveLength(1);
      expect(mockPrisma.stream.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sender: address.toLowerCase() },
        })
      );
    });

    it('returns receiving streams for address', async () => {
      const mockStreams = [
        {
          id: 'stream-2',
          sender: '0x9999999999999999999999999999999999999999',
          recipient: address.toLowerCase(),
          depositAmount: '500000000',
          withdrawnAmount: '100000000',
          active: true,
        },
      ];

      (mockPrisma.stream.findMany as jest.Mock).mockResolvedValue(mockStreams);

      const result = await service.getStreamsByAddress(address, 'receiving');

      expect(result).toHaveLength(1);
      expect(mockPrisma.stream.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipient: address.toLowerCase() },
        })
      );
    });
  });

  describe('MockStreamService.balanceOf', () => {
    const streamId = 'stream-123';

    it('calculates withdrawable balance for active stream', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockStream = {
        id: streamId,
        sender: '0x1234567890123456789012345678901234567890',
        recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        depositAmount: '86400000000', // 86400 USDT over 1 day = 1 USDT per second
        withdrawnAmount: '0',
        startTime: now - 3600, // Started 1 hour ago
        endTime: now + 82800, // 23 hours remaining
        cliffTime: now - 3600, // Cliff passed
        cliffAmount: '0',
        ratePerSecond: '1000000',
        cancelable: true,
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.balanceOf(streamId);

      // After 1 hour, should have ~3600 USDT vested
      expect(result.withdrawable).toBeDefined();
      expect(BigInt(result.withdrawable)).toBeGreaterThan(BigInt(0));
    });

    it('returns zero for stream before cliff', async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockStream = {
        id: streamId,
        depositAmount: '1000000000',
        withdrawnAmount: '0',
        startTime: now - 100,
        endTime: now + 86300,
        cliffTime: now + 3500, // Cliff in future
        active: true,
      };

      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(mockStream);

      const result = await service.balanceOf(streamId);

      expect(result.withdrawable).toBe('0');
    });

    it('returns zero for non-existent stream', async () => {
      (mockPrisma.stream.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.balanceOf(streamId);

      expect(result.withdrawable).toBe('0');
    });
  });
});
