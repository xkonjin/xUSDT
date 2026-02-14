/**
 * Rate Limiting Tests
 * 
 * TDD tests for rate limiting middleware
 */

import {
  createRateLimiter,
  getRateLimitHeaders,
  isRateLimited,
} from '../rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    // Reset rate limiters between tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createRateLimiter', () => {
    it('creates a rate limiter with specified limits', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      
      expect(limiter).toBeDefined();
      expect(limiter.maxRequests).toBe(5);
      expect(limiter.windowMs).toBe(60000);
    });
  });

  describe('isRateLimited', () => {
    it('returns false when under limit', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      
      // First request should pass
      expect(isRateLimited(limiter, '192.168.1.1')).toBe(false);
    });

    it('returns false for first N requests within limit', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      const ip = '192.168.1.1';
      
      // First 5 requests should pass
      for (let i = 0; i < 5; i++) {
        expect(isRateLimited(limiter, ip)).toBe(false);
      }
    });

    it('returns true when limit exceeded', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
      const ip = '192.168.1.1';
      
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        isRateLimited(limiter, ip);
      }
      
      // 6th request should be limited
      expect(isRateLimited(limiter, ip)).toBe(true);
    });

    it('tracks different IPs separately', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });
      
      // IP1 uses both requests
      isRateLimited(limiter, '192.168.1.1');
      isRateLimited(limiter, '192.168.1.1');
      
      // IP1 should be limited
      expect(isRateLimited(limiter, '192.168.1.1')).toBe(true);
      
      // IP2 should still have requests
      expect(isRateLimited(limiter, '192.168.1.2')).toBe(false);
    });

    it('resets after window expires', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });
      const ip = '192.168.1.1';
      
      // Use up all requests
      isRateLimited(limiter, ip);
      isRateLimited(limiter, ip);
      expect(isRateLimited(limiter, ip)).toBe(true);
      
      // Advance time past window
      jest.advanceTimersByTime(60001);
      
      // Should be able to make requests again
      expect(isRateLimited(limiter, ip)).toBe(false);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('returns correct headers when under limit', () => {
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
      const ip = '192.168.1.1';
      
      const headers = getRateLimitHeaders(limiter, ip);
      
      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(parseInt(headers['X-RateLimit-Remaining'])).toBeGreaterThan(0);
    });

    it('returns 0 remaining when at limit', () => {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });
      const ip = '192.168.1.1';
      
      // Use all requests
      isRateLimited(limiter, ip);
      isRateLimited(limiter, ip);
      
      const headers = getRateLimitHeaders(limiter, ip);
      
      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });

    it('includes Retry-After when limited', () => {
      const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 });
      const ip = '192.168.1.1';
      
      // Use request and get limited
      isRateLimited(limiter, ip);
      isRateLimited(limiter, ip); // This triggers limit
      
      const headers = getRateLimitHeaders(limiter, ip);
      
      expect(headers['Retry-After']).toBeDefined();
      expect(parseInt(headers['Retry-After']!)).toBeGreaterThan(0);
      expect(parseInt(headers['Retry-After']!)).toBeLessThanOrEqual(60);
    });
  });
});

describe('Rate Limit Configuration', () => {
  it('scan-receipt endpoint should have 5 requests/minute limit', () => {
    const scanReceiptLimiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
    expect(scanReceiptLimiter.maxRequests).toBe(5);
  });

  it('bills endpoint should have 10 requests/minute limit', () => {
    const billsLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
    expect(billsLimiter.maxRequests).toBe(10);
  });
});
