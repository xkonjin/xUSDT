/**
 * Redis-Based Nonce Manager
 * 
 * Provides distributed nonce tracking to prevent replay attacks across
 * multiple server instances. Uses Redis atomic operations for thread safety.
 * 
 * CRITICAL: Replaces in-memory nonce cache that was vulnerable to replay attacks.
 */

import type { Hex } from 'viem';

// =============================================================================
// Types
// =============================================================================

export interface NonceManagerConfig {
  /** Redis connection URL */
  redisUrl: string;
  /** Key prefix for nonce storage */
  keyPrefix?: string;
  /** TTL for nonce entries in seconds (default: 24 hours) */
  nonceTTL?: number;
}

export interface NonceCheckResult {
  /** Whether the nonce is valid (not previously used) */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

export interface NonceManager {
  /** Check if a nonce has been used */
  isNonceUsed(nonce: Hex): Promise<boolean>;
  /** Mark a nonce as used (atomic operation) */
  markNonceUsed(nonce: Hex): Promise<NonceCheckResult>;
  /** Check and mark nonce in single atomic operation */
  checkAndMarkNonce(nonce: Hex): Promise<NonceCheckResult>;
  /** Get nonce usage statistics */
  getStats(): Promise<{ totalNonces: number; recentNonces: number }>;
  /** Close the connection */
  close(): Promise<void>;
}

// =============================================================================
// Redis Nonce Manager Implementation
// =============================================================================

class RedisNonceManager implements NonceManager {
  private redis: any; // Redis client
  private keyPrefix: string;
  private nonceTTL: number;
  private connected: boolean = false;

  constructor(config: NonceManagerConfig) {
    this.keyPrefix = config.keyPrefix || 'nonce:';
    this.nonceTTL = config.nonceTTL || 86400; // 24 hours default
    this.initRedis(config.redisUrl);
  }

  private async initRedis(redisUrl: string): Promise<void> {
    try {
      const Redis = (await import('ioredis')).default;
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.connected = true;
        console.log('[nonce-manager] Redis connected');
      });

      this.redis.on('error', (err: Error) => {
        console.error('[nonce-manager] Redis error:', err.message);
        this.connected = false;
      });

      await this.redis.connect();
    } catch (error) {
      console.error('[nonce-manager] Failed to initialize Redis:', error);
      throw new Error('Failed to initialize nonce manager');
    }
  }

  private getNonceKey(nonce: Hex): string {
    // Normalize nonce to lowercase for consistent key generation
    return `${this.keyPrefix}${nonce.toLowerCase()}`;
  }

  async isNonceUsed(nonce: Hex): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Nonce manager not connected');
    }

    const key = this.getNonceKey(nonce);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async markNonceUsed(nonce: Hex): Promise<NonceCheckResult> {
    if (!this.connected) {
      return { valid: false, error: 'Nonce manager not connected' };
    }

    const key = this.getNonceKey(nonce);
    
    // Use SET with NX (only set if not exists) and EX (expiry)
    // This is atomic and prevents race conditions
    const result = await this.redis.set(key, Date.now(), 'EX', this.nonceTTL, 'NX');
    
    if (result === 'OK') {
      return { valid: true };
    } else {
      return { valid: false, error: 'Nonce already used' };
    }
  }

  async checkAndMarkNonce(nonce: Hex): Promise<NonceCheckResult> {
    // This is the same as markNonceUsed since SET NX is atomic
    return this.markNonceUsed(nonce);
  }

  async getStats(): Promise<{ totalNonces: number; recentNonces: number }> {
    if (!this.connected) {
      return { totalNonces: 0, recentNonces: 0 };
    }

    // Count all nonce keys
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    const totalNonces = keys.length;

    // Count nonces from last hour
    const oneHourAgo = Date.now() - 3600000;
    let recentNonces = 0;

    if (totalNonces > 0 && totalNonces < 1000) {
      // Only check timestamps for reasonable number of keys
      const pipeline = this.redis.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const results = await pipeline.exec();
      
      for (const [err, timestamp] of results) {
        if (!err && timestamp && parseInt(timestamp) > oneHourAgo) {
          recentNonces++;
        }
      }
    }

    return { totalNonces, recentNonces };
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.connected = false;
    }
  }
}

// =============================================================================
// In-Memory Fallback (for graceful degradation)
// =============================================================================

class InMemoryNonceManager implements NonceManager {
  private nonces: Map<string, number> = new Map();
  private nonceTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(nonceTTL: number = 86400) {
    this.nonceTTL = nonceTTL * 1000; // Convert to milliseconds
    
    // Periodic cleanup of expired nonces
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    
    console.warn('[nonce-manager] Using in-memory fallback - NOT SAFE FOR PRODUCTION');
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [nonce, timestamp] of this.nonces.entries()) {
      if (now - timestamp > this.nonceTTL) {
        this.nonces.delete(nonce);
      }
    }
  }

  async isNonceUsed(nonce: Hex): Promise<boolean> {
    return this.nonces.has(nonce.toLowerCase());
  }

  async markNonceUsed(nonce: Hex): Promise<NonceCheckResult> {
    const key = nonce.toLowerCase();
    
    if (this.nonces.has(key)) {
      return { valid: false, error: 'Nonce already used' };
    }
    
    this.nonces.set(key, Date.now());
    return { valid: true };
  }

  async checkAndMarkNonce(nonce: Hex): Promise<NonceCheckResult> {
    return this.markNonceUsed(nonce);
  }

  async getStats(): Promise<{ totalNonces: number; recentNonces: number }> {
    const oneHourAgo = Date.now() - 3600000;
    let recentNonces = 0;
    
    for (const timestamp of this.nonces.values()) {
      if (timestamp > oneHourAgo) {
        recentNonces++;
      }
    }
    
    return { totalNonces: this.nonces.size, recentNonces };
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.nonces.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let globalNonceManager: NonceManager | null = null;

/**
 * Create a nonce manager from configuration.
 * Falls back to in-memory if Redis is not available (with warning).
 */
export async function createNonceManager(config?: NonceManagerConfig): Promise<NonceManager> {
  const redisUrl = config?.redisUrl || process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      const manager = new RedisNonceManager({
        redisUrl,
        keyPrefix: config?.keyPrefix,
        nonceTTL: config?.nonceTTL,
      });
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return manager;
    } catch (error) {
      console.error('[nonce-manager] Failed to create Redis manager:', error);
      console.warn('[nonce-manager] Falling back to in-memory manager');
    }
  }
  
  // Fallback to in-memory (with warning)
  if (process.env.NODE_ENV === 'production') {
    console.error('[nonce-manager] CRITICAL: Using in-memory nonce manager in production!');
    console.error('[nonce-manager] This is NOT safe and allows replay attacks across servers!');
  }
  
  return new InMemoryNonceManager(config?.nonceTTL);
}

/**
 * Get the global nonce manager instance.
 */
export async function getGlobalNonceManager(): Promise<NonceManager> {
  if (!globalNonceManager) {
    globalNonceManager = await createNonceManager();
  }
  return globalNonceManager;
}

/**
 * Set the global nonce manager instance.
 */
export function setGlobalNonceManager(manager: NonceManager): void {
  globalNonceManager = manager;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validate nonce format (must be bytes32 hex string).
 */
export function isValidNonceFormat(nonce: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(nonce);
}

/**
 * Generate a cryptographically secure nonce.
 */
export function generateSecureNonce(): Hex {
  const crypto = globalThis.crypto || require('crypto').webcrypto;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}
