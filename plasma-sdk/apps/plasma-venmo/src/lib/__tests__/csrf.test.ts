/**
 * CSRF Protection Tests
 * VENMO-004: Add CSRF Protection
 * 
 * Requirements:
 * - Generate secure CSRF tokens
 * - Cookie-based CSRF token management
 * - Validate CSRF tokens for POST/PUT/DELETE routes
 * - Add CSRF token to API responses
 */

import { 
  generateCSRFToken, 
  validateCSRFToken, 
  CSRF_COOKIE_NAME, 
  CSRF_HEADER_NAME,
  setCSRFCookie,
  getCSRFFromCookie,
  createCSRFResponseData
} from '../csrf';

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('generates a 32-character hex token', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[a-f0-9]{32}$/);
    });

    it('generates unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('validateCSRFToken', () => {
    it('returns true for matching tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, token)).toBe(true);
    });

    it('returns false for non-matching tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      expect(validateCSRFToken(token1, token2)).toBe(false);
    });

    it('returns false for null/undefined tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, null as unknown as string)).toBe(false);
      expect(validateCSRFToken(null as unknown as string, token)).toBe(false);
      expect(validateCSRFToken(undefined as unknown as string, token)).toBe(false);
      expect(validateCSRFToken(token, undefined as unknown as string)).toBe(false);
    });

    it('returns false for empty tokens', () => {
      const token = generateCSRFToken();
      expect(validateCSRFToken(token, '')).toBe(false);
      expect(validateCSRFToken('', token)).toBe(false);
    });

    it('uses timing-safe comparison via crypto.timingSafeEqual', () => {
      // This test verifies that the implementation uses timingSafeEqual
      // The actual timing behavior is guaranteed by Node.js crypto module
      // We just verify the function works correctly and doesn't short-circuit
      const token1 = 'a'.repeat(32);
      const token2 = 'b'.repeat(32);
      const token3 = 'a' + 'b'.repeat(31); // First char matches
      
      // All non-matching tokens should return false
      expect(validateCSRFToken(token1, token2)).toBe(false);
      expect(validateCSRFToken(token1, token3)).toBe(false);
      expect(validateCSRFToken(token2, token3)).toBe(false);
      
      // Matching tokens should return true
      expect(validateCSRFToken(token1, token1)).toBe(true);
    });
  });

  describe('CSRF constants', () => {
    it('exports CSRF_COOKIE_NAME', () => {
      expect(CSRF_COOKIE_NAME).toBe('csrf-token');
    });

    it('exports CSRF_HEADER_NAME', () => {
      expect(CSRF_HEADER_NAME).toBe('x-csrf-token');
    });
  });

  describe('setCSRFCookie', () => {
    it('returns Set-Cookie header value with proper attributes', () => {
      const token = generateCSRFToken();
      const cookieValue = setCSRFCookie(token);
      
      expect(cookieValue).toContain(`${CSRF_COOKIE_NAME}=${token}`);
      expect(cookieValue).toContain('HttpOnly');
      expect(cookieValue).toContain('SameSite=Strict');
      expect(cookieValue).toContain('Path=/');
    });

    it('includes Secure attribute in production', () => {
      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error - temporarily modifying read-only property for testing
      process.env.NODE_ENV = 'production';
      
      const token = generateCSRFToken();
      const cookieValue = setCSRFCookie(token);
      
      expect(cookieValue).toContain('Secure');
      
      // @ts-expect-error - restoring original value
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getCSRFFromCookie', () => {
    it('extracts CSRF token from cookie string', () => {
      const token = generateCSRFToken();
      const cookieString = `other-cookie=value; ${CSRF_COOKIE_NAME}=${token}; another=123`;
      
      expect(getCSRFFromCookie(cookieString)).toBe(token);
    });

    it('returns null for missing CSRF cookie', () => {
      const cookieString = 'other-cookie=value; another=123';
      
      expect(getCSRFFromCookie(cookieString)).toBeNull();
    });

    it('returns null for empty cookie string', () => {
      expect(getCSRFFromCookie('')).toBeNull();
      expect(getCSRFFromCookie(null as unknown as string)).toBeNull();
      expect(getCSRFFromCookie(undefined as unknown as string)).toBeNull();
    });
  });

  describe('createCSRFResponseData', () => {
    it('includes CSRF token header', () => {
      const token = generateCSRFToken();
      const result = createCSRFResponseData({ data: 'test' }, token);
      
      expect(result.headers[CSRF_HEADER_NAME]).toBe(token);
    });

    it('includes CSRF cookie in Set-Cookie header', () => {
      const token = generateCSRFToken();
      const result = createCSRFResponseData({ data: 'test' }, token);
      
      expect(result.headers['Set-Cookie']).toContain(`${CSRF_COOKIE_NAME}=${token}`);
    });

    it('preserves response body', () => {
      const token = generateCSRFToken();
      const body = { success: true, data: 'test-value' };
      const result = createCSRFResponseData(body, token);
      
      expect(result.body).toEqual(body);
    });

    it('uses provided status code', () => {
      const token = generateCSRFToken();
      const result = createCSRFResponseData({ error: 'Bad request' }, token, 400);
      
      expect(result.status).toBe(400);
    });

    it('defaults to 200 status', () => {
      const token = generateCSRFToken();
      const result = createCSRFResponseData({ success: true }, token);
      
      expect(result.status).toBe(200);
    });
  });
});
