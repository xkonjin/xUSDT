/**
 * Rate Limiter Tests
 * VENMO-003: Implement rate limiting middleware
 * 
 * Requirements:
 * - 10 requests/min for payment routes (submit-transfer, claims, requests)
 * - 100 requests/min for read routes
 * - Return 429 with Retry-After header when exceeded
 */

import { RateLimiter, RateLimitConfig, RateLimitResult } from '../rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    // Create a fresh rate limiter before each test
    rateLimiter = new RateLimiter();
  });

  describe('basic rate limiting', () => {
    it('allows requests under the limit', () => {
      const config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };
      const ip = '192.168.1.1';

      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.check(ip, config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it('blocks requests over the limit', () => {
      const config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 };
      const ip = '192.168.1.1';

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(ip, config);
      }

      // Next request should be blocked
      const result = rateLimiter.check(ip, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    it('tracks different IPs separately', () => {
      const config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 };
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      // Use up limit for ip1
      for (let i = 0; i < 5; i++) {
        rateLimiter.check(ip1, config);
      }

      // ip1 should be blocked
      expect(rateLimiter.check(ip1, config).allowed).toBe(false);

      // ip2 should still work
      expect(rateLimiter.check(ip2, config).allowed).toBe(true);
    });
  });

  describe('sliding window behavior', () => {
    it('resets after window expires', async () => {
      const config: RateLimitConfig = { maxRequests: 3, windowMs: 100 }; // 100ms window for testing
      const ip = '192.168.1.1';

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        rateLimiter.check(ip, config);
      }

      // Should be blocked
      expect(rateLimiter.check(ip, config).allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      expect(rateLimiter.check(ip, config).allowed).toBe(true);
    });
  });

  describe('route-specific limits', () => {
    it('applies payment route limits (10/min)', () => {
      const paymentConfig: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };
      const ip = '192.168.1.1';

      // Use up payment limit
      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.check(ip, paymentConfig, 'payment');
        expect(result.allowed).toBe(true);
      }

      // 11th request should be blocked
      const result = rateLimiter.check(ip, paymentConfig, 'payment');
      expect(result.allowed).toBe(false);
    });

    it('applies read route limits (100/min)', () => {
      const readConfig: RateLimitConfig = { maxRequests: 100, windowMs: 60000 };
      const ip = '192.168.1.1';

      // First 100 should pass
      for (let i = 0; i < 100; i++) {
        const result = rateLimiter.check(ip, readConfig, 'read');
        expect(result.allowed).toBe(true);
      }

      // 101st should be blocked
      const result = rateLimiter.check(ip, readConfig, 'read');
      expect(result.allowed).toBe(false);
    });

    it('tracks payment and read routes separately', () => {
      const paymentConfig: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };
      const readConfig: RateLimitConfig = { maxRequests: 100, windowMs: 60000 };
      const ip = '192.168.1.1';

      // Max out payment route
      for (let i = 0; i < 10; i++) {
        rateLimiter.check(ip, paymentConfig, 'payment');
      }

      // Payment route should be blocked
      expect(rateLimiter.check(ip, paymentConfig, 'payment').allowed).toBe(false);

      // But read route should still work
      expect(rateLimiter.check(ip, readConfig, 'read').allowed).toBe(true);
    });
  });

  describe('result structure', () => {
    it('returns proper rate limit result structure', () => {
      const config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 };
      const ip = '192.168.1.1';

      const result = rateLimiter.check(ip, config);

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('resetAt');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.resetAt).toBe('number');
    });

    it('includes retryAfter only when blocked', () => {
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
      const ip = '192.168.1.1';

      // First request
      const allowedResult = rateLimiter.check(ip, config);
      expect(allowedResult.retryAfter).toBeUndefined();

      // Second request (blocked)
      const blockedResult = rateLimiter.check(ip, config);
      expect(blockedResult.retryAfter).toBeDefined();
      expect(blockedResult.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('cleanup of old entries', () => {
    it('clears expired entries', async () => {
      const config: RateLimitConfig = { maxRequests: 5, windowMs: 50 };
      
      // Create entries for multiple IPs
      for (let i = 0; i < 10; i++) {
        rateLimiter.check(`192.168.1.${i}`, config);
      }

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger cleanup
      rateLimiter.cleanup();

      // New requests should be allowed (entries were cleaned)
      const result = rateLimiter.check('192.168.1.0', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // Fresh start
    });
  });
});
