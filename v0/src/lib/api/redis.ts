/**
 * Redis Connection Utility for Next.js API Routes
 * 
 * Provides serverless-safe Redis connection for Upstash Redis.
 * Uses Upstash REST API for serverless compatibility.
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

/**
 * Get Redis client (singleton pattern for serverless)
 */
export function getRedis(): Redis {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Fallback: try parsing REDIS_URL if it's a REST URL
    if (redisUrl?.startsWith("https://")) {
      // Extract token from URL or use separate env var
      redis = new Redis({
        url: redisUrl,
        token: redisToken || "",
      });
    } else {
      throw new Error(
        "REDIS_URL/UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required"
      );
    }
  } else {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  return redis;
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get cached value
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const client = getRedis();
      const value = await client.get<T>(key);
      return value;
    } catch (error) {
      console.error("Redis get error:", error);
      return null;
    }
  },

  /**
   * Set cached value with optional TTL (seconds)
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = getRedis();
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error("Redis set error:", error);
      return false;
    }
  },

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    try {
      const client = getRedis();
      await client.del(key);
      return true;
    } catch (error) {
      console.error("Redis del error:", error);
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedis();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error("Redis exists error:", error);
      return false;
    }
  },
};
