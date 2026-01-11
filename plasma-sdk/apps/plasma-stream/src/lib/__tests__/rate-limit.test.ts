/**
 * Rate Limiter Tests
 * 
 * TDD tests for rate limiting utility
 */

import {
  createRateLimiter,
  isRateLimited,
  getRemainingRequests,
  getResetTime,
  getRateLimitHeaders,
  streamsLimiter,
  relayLimiter,
  generalLimiter,
} from '../rate-limit';

describe('createRateLimiter', () => {
  it('creates a rate limiter with specified config', () => {
    const limiter = createRateLimiter({
      maxRequests: 10,
      windowMs: 60000,
    });
    
    expect(limiter.maxRequests).toBe(10);
    expect(limiter.windowMs).toBe(60000);
    expect(limiter.requests).toBeInstanceOf(Map);
  });
});

describe('isRateLimited', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({
      maxRequests: 3,
      windowMs: 60000,
    });
    
    expect(isRateLimited(limiter, 'test-key')).toBe(false);
    expect(isRateLimited(limiter, 'test-key')).toBe(false);
    expect(isRateLimited(limiter, 'test-key')).toBe(false);
  });

  it('blocks requests over the limit', () => {
    const limiter = createRateLimiter({
      maxRequests: 2,
      windowMs: 60000,
    });
    
    expect(isRateLimited(limiter, 'test-key')).toBe(false);
    expect(isRateLimited(limiter, 'test-key')).toBe(false);
    // Third request should be blocked
    expect(isRateLimited(limiter, 'test-key')).toBe(true);
  });

  it('tracks different keys separately', () => {
    const limiter = createRateLimiter({
      maxRequests: 1,
      windowMs: 60000,
    });
    
    expect(isRateLimited(limiter, 'key-1')).toBe(false);
    expect(isRateLimited(limiter, 'key-2')).toBe(false);
    expect(isRateLimited(limiter, 'key-1')).toBe(true);
    expect(isRateLimited(limiter, 'key-2')).toBe(true);
  });
});

describe('getRemainingRequests', () => {
  it('returns max for new keys', () => {
    const limiter = createRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
    });
    
    expect(getRemainingRequests(limiter, 'new-key')).toBe(5);
  });

  it('decrements with each request', () => {
    const limiter = createRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
    });
    
    isRateLimited(limiter, 'test-key');
    expect(getRemainingRequests(limiter, 'test-key')).toBe(4);
    
    isRateLimited(limiter, 'test-key');
    expect(getRemainingRequests(limiter, 'test-key')).toBe(3);
  });

  it('returns 0 when at limit', () => {
    const limiter = createRateLimiter({
      maxRequests: 2,
      windowMs: 60000,
    });
    
    isRateLimited(limiter, 'test-key');
    isRateLimited(limiter, 'test-key');
    expect(getRemainingRequests(limiter, 'test-key')).toBe(0);
  });
});

describe('getResetTime', () => {
  it('returns 0 for new keys', () => {
    const limiter = createRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
    });
    
    expect(getResetTime(limiter, 'new-key')).toBe(0);
  });

  it('returns time until reset for active keys', () => {
    const limiter = createRateLimiter({
      maxRequests: 5,
      windowMs: 60000,
    });
    
    isRateLimited(limiter, 'test-key');
    const resetTime = getResetTime(limiter, 'test-key');
    
    // Should be close to 60 seconds
    expect(resetTime).toBeGreaterThan(0);
    expect(resetTime).toBeLessThanOrEqual(60);
  });
});

describe('getRateLimitHeaders', () => {
  it('includes limit and remaining headers', () => {
    const limiter = createRateLimiter({
      maxRequests: 10,
      windowMs: 60000,
    });
    
    const headers = getRateLimitHeaders(limiter, 'test-key');
    
    expect(headers['X-RateLimit-Limit']).toBe('10');
    expect(headers['X-RateLimit-Remaining']).toBe('10');
  });

  it('includes Retry-After when at limit', () => {
    const limiter = createRateLimiter({
      maxRequests: 1,
      windowMs: 60000,
    });
    
    isRateLimited(limiter, 'test-key');
    const headers = getRateLimitHeaders(limiter, 'test-key');
    
    expect(headers['Retry-After']).toBeDefined();
  });
});

describe('pre-configured limiters', () => {
  it('has streamsLimiter with 10 requests per minute', () => {
    expect(streamsLimiter.maxRequests).toBe(10);
    expect(streamsLimiter.windowMs).toBe(60000);
  });

  it('has relayLimiter with 5 requests per minute', () => {
    expect(relayLimiter.maxRequests).toBe(5);
    expect(relayLimiter.windowMs).toBe(60000);
  });

  it('has generalLimiter with 30 requests per minute', () => {
    expect(generalLimiter.maxRequests).toBe(30);
    expect(generalLimiter.windowMs).toBe(60000);
  });
});
