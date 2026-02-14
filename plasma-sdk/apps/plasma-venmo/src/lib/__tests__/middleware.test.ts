/**
 * Middleware Helper Tests
 * Tests for rate limiting helper functions
 * 
 * Note: The actual middleware uses NextRequest which requires Edge Runtime.
 * These tests focus on the core rate limiting logic which is already covered
 * by rate-limiter.test.ts. Here we test helper utilities.
 */

import { 
  getClientIP, 
  getRouteType, 
  RateLimiter, 
  RATE_LIMIT_CONFIGS 
} from '../rate-limiter';

describe('Rate Limiter Helper Functions', () => {
  describe('getClientIP', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: new Map([
          ['x-forwarded-for', '192.168.1.100, 10.0.0.1'],
        ]) as unknown as Headers,
      } as Request;

      expect(getClientIP(mockRequest)).toBe('192.168.1.100');
    });

    it('extracts IP from cf-connecting-ip header', () => {
      const mockRequest = {
        headers: new Map([
          ['cf-connecting-ip', '10.0.0.50'],
        ]) as unknown as Headers,
      } as Request;

      expect(getClientIP(mockRequest)).toBe('10.0.0.50');
    });

    it('extracts IP from x-real-ip header', () => {
      const mockRequest = {
        headers: new Map([
          ['x-real-ip', '172.16.0.1'],
        ]) as unknown as Headers,
      } as Request;

      expect(getClientIP(mockRequest)).toBe('172.16.0.1');
    });

    it('returns unknown for missing headers', () => {
      const mockRequest = {
        headers: new Map() as unknown as Headers,
      } as Request;

      expect(getClientIP(mockRequest)).toBe('unknown');
    });
  });

  describe('getRouteType', () => {
    it('identifies payment routes correctly', () => {
      const paymentRoutes = [
        '/api/submit-transfer',
        '/api/claims',
        '/api/claims/abc123',
        '/api/requests',
        '/api/requests/123',
        '/api/payment-links',
        '/api/share-links',
        '/api/referrals/pay',
        '/api/relay',
        '/api/notify',
      ];

      for (const route of paymentRoutes) {
        expect(getRouteType(route)).toBe('payment');
      }
    });

    it('identifies read routes correctly', () => {
      const readRoutes = [
        '/api/history',
        '/api/resolve-recipient',
        '/api/user-settings',
        '/api/referrals',
        '/api/gas-sponsorship',
      ];

      for (const route of readRoutes) {
        expect(getRouteType(route)).toBe('read');
      }
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('has correct payment route configuration', () => {
      expect(RATE_LIMIT_CONFIGS.payment).toEqual({
        maxRequests: 10,
        windowMs: 60000,
      });
    });

    it('has correct read route configuration', () => {
      expect(RATE_LIMIT_CONFIGS.read).toEqual({
        maxRequests: 100,
        windowMs: 60000,
      });
    });
  });

  describe('Integration: RateLimiter with configs', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter();
    });

    it('enforces payment limits correctly', () => {
      const ip = '192.168.1.1';
      const config = RATE_LIMIT_CONFIGS.payment;

      // 10 requests should pass
      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.check(ip, config, 'payment');
        expect(result.allowed).toBe(true);
      }

      // 11th should be blocked
      const result = rateLimiter.check(ip, config, 'payment');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('enforces read limits correctly', () => {
      const ip = '192.168.1.2';
      const config = RATE_LIMIT_CONFIGS.read;

      // 100 requests should pass
      for (let i = 0; i < 100; i++) {
        const result = rateLimiter.check(ip, config, 'read');
        expect(result.allowed).toBe(true);
      }

      // 101st should be blocked
      const result = rateLimiter.check(ip, config, 'read');
      expect(result.allowed).toBe(false);
    });

    it('tracks payment and read separately', () => {
      const ip = '192.168.1.3';

      // Max out payment route
      for (let i = 0; i < 10; i++) {
        rateLimiter.check(ip, RATE_LIMIT_CONFIGS.payment, 'payment');
      }

      // Payment blocked
      expect(rateLimiter.check(ip, RATE_LIMIT_CONFIGS.payment, 'payment').allowed).toBe(false);

      // Read still works
      expect(rateLimiter.check(ip, RATE_LIMIT_CONFIGS.read, 'read').allowed).toBe(true);
    });
  });
});
