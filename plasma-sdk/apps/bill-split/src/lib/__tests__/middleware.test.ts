/**
 * Middleware Tests
 * 
 * Tests for authentication and rate limiting middleware logic.
 */

import { isPublicRoute, requiresAuth } from '../auth';

describe('Middleware Auth Logic', () => {
  describe('isPublicRoute', () => {
    it('should identify scan-receipt as public', () => {
      expect(isPublicRoute('/api/scan-receipt')).toBe(true);
      expect(isPublicRoute('/api/scan-receipt/')).toBe(true);
    });

    it('should identify payment intent GET as public', () => {
      expect(isPublicRoute('/api/pay/intent-123')).toBe(true);
      expect(isPublicRoute('/api/pay/abc-def-ghi-jkl')).toBe(true);
    });

    it('should identify health endpoints as public', () => {
      expect(isPublicRoute('/api/health')).toBe(true);
    });

    it('should not identify bills as public', () => {
      expect(isPublicRoute('/api/bills')).toBe(false);
      expect(isPublicRoute('/api/bills/123')).toBe(false);
    });

    it('should not identify relay as public', () => {
      expect(isPublicRoute('/api/relay')).toBe(false);
    });
  });

  describe('requiresAuth', () => {
    it('should require auth for bills endpoints', () => {
      expect(requiresAuth('/api/bills')).toBe(true);
      expect(requiresAuth('/api/bills/123')).toBe(true);
      expect(requiresAuth('/api/bills/123/pay/456')).toBe(true);
    });

    it('should require auth for relay endpoint', () => {
      expect(requiresAuth('/api/relay')).toBe(true);
    });

    it('should not require auth for scan-receipt', () => {
      expect(requiresAuth('/api/scan-receipt')).toBe(false);
    });

    it('should not require auth for payment intent', () => {
      expect(requiresAuth('/api/pay/intent-123')).toBe(false);
    });

    it('should not require auth for health endpoints', () => {
      expect(requiresAuth('/api/health')).toBe(false);
    });

    it('should not require auth for webhooks', () => {
      expect(requiresAuth('/api/webhooks/bridge')).toBe(false);
    });
  });

  describe('Route Pattern Matching', () => {
    it('should handle edge cases with slashes', () => {
      expect(requiresAuth('/api/bills/')).toBe(true);
      expect(requiresAuth('/api/bills//123')).toBe(true);
    });

    it('should handle nested bill paths', () => {
      expect(requiresAuth('/api/bills/bill-id/pay/participant-id')).toBe(true);
    });

    it('should not match partial routes', () => {
      // These should not match /api/bills pattern
      expect(requiresAuth('/api/billing')).toBe(false);
      expect(requiresAuth('/api/bill')).toBe(false);
    });
  });
});

describe('Authorization Header Validation', () => {
  it('should validate proper Bearer format', () => {
    const validHeaders = [
      'Bearer token123',
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'bearer token123',
      'BEARER TOKEN',
    ];

    const isValidBearerFormat = (header: string): boolean => {
      if (!header) return false;
      const trimmed = header.trim();
      if (!trimmed.toLowerCase().startsWith('bearer ')) return false;
      const token = trimmed.slice(7).trim();
      return token.length > 0;
    };

    validHeaders.forEach(header => {
      expect(isValidBearerFormat(header)).toBe(true);
    });
  });

  it('should reject invalid header formats', () => {
    const invalidHeaders = [
      '',
      'Basic abc123',
      'Bearer',
      'Bearer ',
      'Token abc123',
      null,
    ];

    const isValidBearerFormat = (header: string | null): boolean => {
      if (!header) return false;
      const trimmed = header.trim();
      if (!trimmed.toLowerCase().startsWith('bearer ')) return false;
      const token = trimmed.slice(7).trim();
      return token.length > 0;
    };

    invalidHeaders.forEach(header => {
      expect(isValidBearerFormat(header)).toBe(false);
    });
  });
});
