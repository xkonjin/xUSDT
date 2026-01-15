/**
 * Tests for Rate Limiter utility
 * 
 * SUB-003: Add rate limiting to API endpoints
 * - /api/scan: 3 requests per minute (Gmail quota protection)
 * - /api/categorize: 5 requests per minute (OpenAI cost protection)
 */

import { RateLimiter, RATE_LIMITS } from '../../src/lib/rate-limiter';

describe('Rate Limiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  describe('basic rate limiting', () => {
    it('should allow requests within rate limit', () => {
      const config = { maxRequests: 3, windowMs: 60000 };
      const ip = '192.168.1.1';

      const result1 = rateLimiter.check(ip, config);
      const result2 = rateLimiter.check(ip, config);
      const result3 = rateLimiter.check(ip, config);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests exceeding rate limit', () => {
      const config = { maxRequests: 3, windowMs: 60000 };
      const ip = '192.168.1.1';

      rateLimiter.check(ip, config);
      rateLimiter.check(ip, config);
      rateLimiter.check(ip, config);
      const result = rateLimiter.check(ip, config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset after window expires', async () => {
      const config = { maxRequests: 3, windowMs: 100 }; // 100ms window for testing
      const ip = '192.168.1.1';

      // Exhaust rate limit
      rateLimiter.check(ip, config);
      rateLimiter.check(ip, config);
      rateLimiter.check(ip, config);
      const blockedResult = rateLimiter.check(ip, config);
      expect(blockedResult.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = rateLimiter.check(ip, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should track different IPs independently', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      // Exhaust IP 1
      rateLimiter.check('192.168.1.1', config);
      rateLimiter.check('192.168.1.1', config);
      const ip1Result = rateLimiter.check('192.168.1.1', config);

      // IP 2 should still have quota
      const ip2Result = rateLimiter.check('192.168.1.2', config);

      expect(ip1Result.allowed).toBe(false);
      expect(ip2Result.allowed).toBe(true);
    });

    it('should return correct retry-after header value', () => {
      const config = { maxRequests: 1, windowMs: 60000 };
      const ip = '192.168.1.1';

      rateLimiter.check(ip, config);
      const result = rateLimiter.check(ip, config);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have correct limit for /api/scan', () => {
      expect(RATE_LIMITS.scan).toEqual({
        maxRequests: 3,
        windowMs: 60000, // 1 minute
      });
    });

    it('should have correct limit for /api/categorize', () => {
      expect(RATE_LIMITS.categorize).toEqual({
        maxRequests: 5,
        windowMs: 60000, // 1 minute
      });
    });
  });

  describe('Memory cleanup', () => {
    it('should clean up expired entries', async () => {
      const config = { maxRequests: 3, windowMs: 50 };

      // Add entries for multiple IPs
      rateLimiter.check('192.168.1.1', config);
      rateLimiter.check('192.168.1.2', config);
      
      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger cleanup
      rateLimiter.cleanup();

      // New requests should be allowed (entries were cleaned)
      const result = rateLimiter.check('192.168.1.1', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // Fresh start
    });
  });
});
