/**
 * Wallet Persistence Service
 * 
 * SPLITZY-002: Save wallet addresses to database
 * Handles storage and retrieval of Telegram user wallet mappings.
 */

import { prisma } from '@plasma-pay/db';
import type { TelegramWallet } from '../types.js';

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

/**
 * In-memory cache for wallet lookups
 * Reduces database queries for frequently accessed wallets
 */
const walletCache = new Map<string, string>(); // telegramUserId -> walletAddress

// ============================================================================
// WALLET CRUD OPERATIONS
// ============================================================================

/**
 * Saves or updates a wallet address for a Telegram user
 * Uses upsert to handle both new and existing users
 * 
 * @param telegramUserId - Telegram user ID as string
 * @param telegramUsername - Optional Telegram username
 * @param walletAddress - Ethereum/Plasma wallet address
 * @returns The saved wallet record
 */
export async function saveTelegramWallet(
  telegramUserId: string,
  telegramUsername: string | undefined,
  walletAddress: string
): Promise<TelegramWallet> {
  const dbWallet = await prisma.telegramWallet.upsert({
    where: { telegramUserId },
    update: {
      telegramUsername,
      walletAddress,
    },
    create: {
      telegramUserId,
      telegramUsername,
      walletAddress,
    },
  });
  
  // Update cache
  walletCache.set(telegramUserId, walletAddress);
  
  console.log(`Saved wallet for Telegram user ${telegramUserId}: ${walletAddress.slice(0, 8)}...`);
  
  return {
    telegramUserId: Number(dbWallet.telegramUserId),
    telegramUsername: dbWallet.telegramUsername || undefined,
    walletAddress: dbWallet.walletAddress,
    createdAt: dbWallet.createdAt,
  };
}

/**
 * Gets the wallet address for a Telegram user
 * Checks cache first, then database
 * 
 * @param telegramUserId - Telegram user ID as string
 * @returns Wallet record or null if not found
 */
export async function getTelegramWallet(
  telegramUserId: string
): Promise<TelegramWallet | null> {
  // Check cache first
  const cachedAddress = walletCache.get(telegramUserId);
  if (cachedAddress) {
    return {
      telegramUserId: Number(telegramUserId),
      walletAddress: cachedAddress,
      createdAt: new Date(), // Approximate, from cache
    };
  }
  
  // Query database
  const dbWallet = await prisma.telegramWallet.findUnique({
    where: { telegramUserId },
  });
  
  if (!dbWallet) {
    return null;
  }
  
  // Update cache
  walletCache.set(telegramUserId, dbWallet.walletAddress);
  
  return {
    telegramUserId: Number(dbWallet.telegramUserId),
    telegramUsername: dbWallet.telegramUsername || undefined,
    walletAddress: dbWallet.walletAddress,
    createdAt: dbWallet.createdAt,
  };
}

/**
 * Gets all telegram wallet mappings
 * Used for statistics and admin purposes
 * 
 * @returns Array of all wallet records
 */
export async function getAllTelegramWallets(): Promise<TelegramWallet[]> {
  const dbWallets = await prisma.telegramWallet.findMany();
  
  return dbWallets.map(w => ({
    telegramUserId: Number(w.telegramUserId),
    telegramUsername: w.telegramUsername || undefined,
    walletAddress: w.walletAddress,
    createdAt: w.createdAt,
  }));
}

/**
 * Deletes a wallet mapping for a Telegram user
 * 
 * @param telegramUserId - Telegram user ID as string
 */
export async function deleteTelegramWallet(telegramUserId: string): Promise<void> {
  try {
    await prisma.telegramWallet.delete({
      where: { telegramUserId },
    });
    
    // Remove from cache
    walletCache.delete(telegramUserId);
    
    console.log(`Deleted wallet for Telegram user ${telegramUserId}`);
  } catch (error) {
    // Handle case where record doesn't exist
    console.log(`No wallet found for Telegram user ${telegramUserId}`);
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Loads all telegram wallets into cache
 * Should be called on bot startup to warm the cache
 * 
 * @returns Number of wallets loaded
 */
export async function loadTelegramWalletsToCache(): Promise<number> {
  const wallets = await prisma.telegramWallet.findMany();
  
  walletCache.clear();
  
  for (const wallet of wallets) {
    walletCache.set(wallet.telegramUserId, wallet.walletAddress);
  }
  
  console.log(`Loaded ${wallets.length} wallet(s) to cache`);
  return wallets.length;
}

/**
 * Gets the cached wallet address without database lookup
 * Returns undefined if not in cache
 * 
 * @param telegramUserId - Telegram user ID as string
 * @returns Wallet address or undefined
 */
export function getCachedWalletAddress(telegramUserId: string): string | undefined {
  return walletCache.get(telegramUserId);
}

/**
 * Clears the wallet cache
 * Useful for testing or forced refresh
 */
export function clearWalletCache(): void {
  walletCache.clear();
}

/**
 * Gets cache statistics
 */
export function getWalletCacheStats(): {
  size: number;
} {
  return {
    size: walletCache.size,
  };
}

// ============================================================================
// SIMPLIFIED HELPER FUNCTIONS (SPLITZY-003)
// ============================================================================

/**
 * Gets wallet address by Telegram ID (simplified interface)
 * 
 * @param telegramId - Telegram user ID as string
 * @returns Wallet address or null if not found
 */
export async function getWalletByTelegramId(telegramId: string): Promise<string | null> {
  try {
    const wallet = await getTelegramWallet(telegramId);
    return wallet?.walletAddress || null;
  } catch (error) {
    console.error('Failed to fetch wallet:', error);
    return null;
  }
}

/**
 * Saves or updates a wallet address (simplified interface)
 * 
 * @param telegramId - Telegram user ID as string
 * @param address - Ethereum/Plasma wallet address
 * @returns True if successful, false otherwise
 */
export async function saveWallet(telegramId: string, address: string): Promise<boolean> {
  try {
    await saveTelegramWallet(telegramId, undefined, address.toLowerCase());
    return true;
  } catch (error) {
    console.error('Failed to save wallet:', error);
    return false;
  }
}

/**
 * Gets existing wallet or returns null (for later wallet creation flow)
 * 
 * @param telegramId - Telegram user ID as string
 * @returns Wallet address or null if needs to be connected
 */
export async function getOrCreateWallet(telegramId: string): Promise<string | null> {
  const existing = await getWalletByTelegramId(telegramId);
  if (existing) return existing;
  
  // In production, this would create a new wallet via Privy or similar
  // For now, return null to indicate wallet needs to be connected
  return null;
}
