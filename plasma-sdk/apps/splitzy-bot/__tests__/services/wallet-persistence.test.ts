/**
 * Tests for Wallet Persistence Service
 * 
 * SPLITZY-002: Save wallet addresses to database
 * - Use TelegramWallet model from @plasma-pay/db
 * - Save on wallet entry via /wallet command
 * - Retrieve on bot start
 */

import { prisma } from '@plasma-pay/db';

// Import functions to test (will be implemented)
import {
  saveTelegramWallet,
  getTelegramWallet,
  getAllTelegramWallets,
  deleteTelegramWallet,
  loadTelegramWalletsToCache,
} from '../../src/services/wallet';

// Mock prisma methods
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Wallet Persistence Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear the wallet cache before each test
    const { clearWalletCache } = await import('../../src/services/wallet');
    clearWalletCache();
  });

  describe('saveTelegramWallet', () => {
    it('should create new wallet for new telegram user', async () => {
      const mockDbWallet = {
        id: 'wallet-123',
        telegramUserId: '123456',
        telegramUsername: 'alice',
        walletAddress: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.telegramWallet.upsert as jest.Mock).mockResolvedValue(mockDbWallet);

      const result = await saveTelegramWallet(
        '123456',
        'alice',
        '0x1234567890123456789012345678901234567890'
      );

      expect(mockPrisma.telegramWallet.upsert).toHaveBeenCalledWith({
        where: { telegramUserId: '123456' },
        update: {
          telegramUsername: 'alice',
          walletAddress: '0x1234567890123456789012345678901234567890',
        },
        create: {
          telegramUserId: '123456',
          telegramUsername: 'alice',
          walletAddress: '0x1234567890123456789012345678901234567890',
        },
      });
      // Result is mapped from DB to internal type (telegramUserId becomes number)
      expect(result.telegramUserId).toBe(123456);
      expect(result.walletAddress).toBe(mockDbWallet.walletAddress);
    });

    it('should update existing wallet for returning user', async () => {
      const existingWallet = {
        id: 'wallet-123',
        telegramUserId: '123456',
        telegramUsername: 'alice',
        walletAddress: '0xnewaddress1234567890123456789012345678',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      (mockPrisma.telegramWallet.upsert as jest.Mock).mockResolvedValue(existingWallet);

      const result = await saveTelegramWallet(
        '123456',
        'alice',
        '0xnewaddress1234567890123456789012345678'
      );

      expect(result.walletAddress).toBe('0xnewaddress1234567890123456789012345678');
    });

    it('should handle null username', async () => {
      const mockWallet = {
        id: 'wallet-123',
        telegramUserId: '123456',
        telegramUsername: null,
        walletAddress: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.telegramWallet.upsert as jest.Mock).mockResolvedValue(mockWallet);

      await saveTelegramWallet(
        '123456',
        undefined,
        '0x1234567890123456789012345678901234567890'
      );

      expect(mockPrisma.telegramWallet.upsert).toHaveBeenCalledWith({
        where: { telegramUserId: '123456' },
        update: {
          telegramUsername: undefined,
          walletAddress: '0x1234567890123456789012345678901234567890',
        },
        create: {
          telegramUserId: '123456',
          telegramUsername: undefined,
          walletAddress: '0x1234567890123456789012345678901234567890',
        },
      });
    });
  });

  describe('getTelegramWallet', () => {
    it('should retrieve wallet by telegram user ID', async () => {
      const mockDbWallet = {
        id: 'wallet-123',
        telegramUserId: '123456',
        telegramUsername: 'alice',
        walletAddress: '0x1234567890123456789012345678901234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.telegramWallet.findUnique as jest.Mock).mockResolvedValue(mockDbWallet);

      const result = await getTelegramWallet('123456');

      expect(mockPrisma.telegramWallet.findUnique).toHaveBeenCalledWith({
        where: { telegramUserId: '123456' },
      });
      expect(result?.walletAddress).toBe(mockDbWallet.walletAddress);
    });

    it('should return null for non-existent user', async () => {
      (mockPrisma.telegramWallet.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getTelegramWallet('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllTelegramWallets', () => {
    it('should retrieve all wallets from database', async () => {
      const mockWallets = [
        { id: 'w1', telegramUserId: '111', walletAddress: '0x111' },
        { id: 'w2', telegramUserId: '222', walletAddress: '0x222' },
        { id: 'w3', telegramUserId: '333', walletAddress: '0x333' },
      ];

      (mockPrisma.telegramWallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

      const result = await getAllTelegramWallets();

      expect(mockPrisma.telegramWallet.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no wallets exist', async () => {
      (mockPrisma.telegramWallet.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getAllTelegramWallets();

      expect(result).toEqual([]);
    });
  });

  describe('deleteTelegramWallet', () => {
    it('should delete wallet by telegram user ID', async () => {
      (mockPrisma.telegramWallet.delete as jest.Mock).mockResolvedValue({
        id: 'wallet-123',
        telegramUserId: '123456',
      });

      await deleteTelegramWallet('123456');

      expect(mockPrisma.telegramWallet.delete).toHaveBeenCalledWith({
        where: { telegramUserId: '123456' },
      });
    });

    it('should handle deletion of non-existent wallet gracefully', async () => {
      (mockPrisma.telegramWallet.delete as jest.Mock).mockRejectedValue(
        new Error('Record to delete not found')
      );

      // Should not throw
      await expect(deleteTelegramWallet('non-existent')).resolves.not.toThrow();
    });
  });

  describe('loadTelegramWalletsToCache', () => {
    it('should load all wallets and return count', async () => {
      const mockWallets = [
        { telegramUserId: '111', walletAddress: '0x111' },
        { telegramUserId: '222', walletAddress: '0x222' },
      ];

      (mockPrisma.telegramWallet.findMany as jest.Mock).mockResolvedValue(mockWallets);

      const count = await loadTelegramWalletsToCache();

      expect(count).toBe(2);
    });

    it('should return 0 when no wallets exist', async () => {
      (mockPrisma.telegramWallet.findMany as jest.Mock).mockResolvedValue([]);

      const count = await loadTelegramWalletsToCache();

      expect(count).toBe(0);
    });
  });
});
