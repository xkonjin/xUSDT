/**
 * Rate Limiter for SubKiller API routes
 * SUB-003: Add rate limiting to API endpoints
 * 
 * Uses in-memory Map-based storage for development.
 * In production, this could be backed by Redis for distributed rate limiting.
 * 
 * Limits:
 * - /api/scan: 3 requests per minute (Gmail quota protection)
 * - /api/categorize: 5 requests per minute (OpenAI cost protection)
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry>;

  constructor() {
    this.store = new Map();
  }

  /**
   * Generate a unique key for the rate limit entry
   */
  private getKey(identifier: string, routeType?: string): string {
    return routeType ? `${identifier}:${routeType}` : identifier;
  }

  /**
   * Check if a request should be allowed
   */
  check(
    identifier: string,
    config: RateLimitConfig,
    routeType?: string
  ): RateLimitResult {
    const key = this.getKey(identifier, routeType);
    const now = Date.now();
    const resetAt = now + config.windowMs;

    let entry = this.store.get(key);

    // If no entry or entry has expired, create a new one
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 1,
        resetAt,
      };
      this.store.set(key, entry);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        limit: config.maxRequests,
        resetAt,
      };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > config.maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        limit: config.maxRequests,
        resetAt: entry.resetAt,
        retryAfter: retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      limit: config.maxRequests,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get the current size of the store (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

// Predefined configurations for SubKiller routes
export const RATE_LIMITS = {
  // /api/scan: 3 requests per minute (Gmail quota protection)
  scan: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
  },
  // /api/categorize: 5 requests per minute (OpenAI cost protection)
  categorize: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

// Simple API matching the specification interface
export const LIMITS = {
  scan: { max: 5, window: 60000 },
  categorize: { max: 20, window: 60000 },
  cancel: { max: 10, window: 60000 },
};

// Simple store for the checkRateLimit function
const simpleStore = new Map<string, RateLimitEntry>();

/**
 * Simple rate limit check function matching the specification interface
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = simpleStore.get(key);

  if (entry && entry.resetAt > now) {
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((entry.resetAt - now) / 1000),
      };
    }
    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  const resetAt = now + windowMs;
  simpleStore.set(key, { count: 1, resetAt });
  return {
    allowed: true,
    remaining: maxRequests - 1,
    resetIn: Math.ceil(windowMs / 1000),
  };
}

// Singleton instance for use across the application
let globalRateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter();
    
    // Set up periodic cleanup (every 5 minutes)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        globalRateLimiter?.cleanup();
      }, 5 * 60 * 1000);
    }
  }
  return globalRateLimiter;
}

/**
 * Helper to get the client IP from request headers
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  
  // Vercel / Cloudflare headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Cloudflare specific
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Real IP header (nginx)
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Determine route type based on pathname for SubKiller
 */
export function getRouteType(pathname: string): 'scan' | 'categorize' | 'other' {
  if (pathname === '/api/scan') {
    return 'scan';
  }
  if (pathname === '/api/categorize') {
    return 'categorize';
  }
  return 'other';
}
