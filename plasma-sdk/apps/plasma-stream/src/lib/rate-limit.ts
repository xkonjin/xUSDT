/**
 * Rate Limiting Utility
 * 
 * In-memory rate limiter for API endpoints.
 * Uses sliding window algorithm for fair rate limiting.
 * 
 * Configuration:
 * - /api/streams: 10 requests/minute per wallet
 * - /api/relay: 5 requests/minute per IP (transaction relay protection)
 * - Other API routes: 30 requests/minute per IP
 */

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimiter extends RateLimiterConfig {
  requests: Map<string, number[]>;
}

/**
 * Create a new rate limiter with the specified configuration.
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return {
    ...config,
    requests: new Map(),
  };
}

/**
 * Check if a key (IP or wallet address) is rate limited.
 * Records the request if not limited.
 * 
 * @param limiter - The rate limiter instance
 * @param key - The identifier (IP address or wallet address)
 * @returns true if rate limited, false if request is allowed
 */
export function isRateLimited(limiter: RateLimiter, key: string): boolean {
  const now = Date.now();
  const windowStart = now - limiter.windowMs;
  
  // Get existing requests for this key
  const requests = limiter.requests.get(key) || [];
  
  // Filter to only requests within the current window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  // Check if at limit
  if (validRequests.length >= limiter.maxRequests) {
    // Update stored requests (cleanup old ones)
    limiter.requests.set(key, validRequests);
    return true;
  }
  
  // Record this request
  validRequests.push(now);
  limiter.requests.set(key, validRequests);
  
  return false;
}

/**
 * Get the number of remaining requests for a key.
 */
export function getRemainingRequests(limiter: RateLimiter, key: string): number {
  const now = Date.now();
  const windowStart = now - limiter.windowMs;
  
  const requests = limiter.requests.get(key) || [];
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  
  return Math.max(0, limiter.maxRequests - validRequests.length);
}

/**
 * Get the time until the rate limit resets for a key.
 */
export function getResetTime(limiter: RateLimiter, key: string): number {
  const requests = limiter.requests.get(key) || [];
  if (requests.length === 0) return 0;
  
  const oldestRequest = Math.min(...requests);
  const resetAt = oldestRequest + limiter.windowMs;
  const now = Date.now();
  
  return Math.max(0, Math.ceil((resetAt - now) / 1000));
}

/**
 * Get rate limit headers for a response.
 */
export function getRateLimitHeaders(
  limiter: RateLimiter,
  key: string
): Record<string, string> {
  const remaining = getRemainingRequests(limiter, key);
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limiter.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
  };
  
  if (remaining === 0) {
    headers['Retry-After'] = String(getResetTime(limiter, key));
  }
  
  return headers;
}

/**
 * Clear expired entries from the rate limiter (memory cleanup).
 */
export function cleanupRateLimiter(limiter: RateLimiter): void {
  const now = Date.now();
  const windowStart = now - limiter.windowMs;
  
  for (const [key, requests] of limiter.requests.entries()) {
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    if (validRequests.length === 0) {
      limiter.requests.delete(key);
    } else {
      limiter.requests.set(key, validRequests);
    }
  }
}

// =============================================================================
// Pre-configured Rate Limiters
// =============================================================================

/**
 * Rate limiter for /api/streams endpoint.
 * 10 requests per minute per wallet address.
 */
export const streamsLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Rate limiter for /api/relay endpoint.
 * 5 requests per minute per IP - protects against transaction spam.
 */
export const relayLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * General API rate limiter for other endpoints.
 * 30 requests per minute per IP.
 */
export const generalLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
});

// Cleanup expired entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupRateLimiter(streamsLimiter);
    cleanupRateLimiter(relayLimiter);
    cleanupRateLimiter(generalLimiter);
  }, 5 * 60 * 1000);
}
