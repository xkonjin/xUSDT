/**
 * Rate Limiter for API routes
 * VENMO-003: Implement rate limiting middleware
 * 
 * Uses in-memory Map-based storage for development.
 * In production, this could be backed by Redis for distributed rate limiting.
 * 
 * Limits:
 * - Payment routes (submit-transfer, claims, requests): 10/min
 * - Read routes: 100/min
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

// Predefined configurations for different route types
export const RATE_LIMIT_CONFIGS = {
  // Payment routes: 10 requests per minute
  payment: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Read routes: 100 requests per minute
  read: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Bridge routes: 30 requests per minute (quotes are expensive)
  bridge: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

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
  // Check various headers for client IP
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
 * Determine route type based on pathname
 */
export function getRouteType(pathname: string): 'payment' | 'read' {
  // Payment routes that modify state
  const paymentPatterns = [
    '/api/submit-transfer',
    '/api/claims',
    '/api/requests',
    '/api/payment-links',
    '/api/share-links',
    '/api/referrals/pay',
    '/api/relay',
    '/api/notify',
  ];
  
  for (const pattern of paymentPatterns) {
    if (pathname.startsWith(pattern)) {
      return 'payment';
    }
  }
  
  return 'read';
}
