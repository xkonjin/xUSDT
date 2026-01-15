/**
 * Tests for Telegram initData Validation
 *
 * Tests HMAC-SHA256 signature validation for Telegram WebApp authentication.
 */

import {
  parseTelegramInitData,
  generateDataCheckString,
  computeHmacSha256,
  validateTelegramInitData,
  createValidInitData,
  TelegramInitData,
} from '../telegram-auth';

// Test bot token (fake, for testing only)
const TEST_BOT_TOKEN = '1234567890:ABCDEFghijklmnopqrstuvwxyz123456789';

describe('Telegram Auth Utilities', () => {
  describe('parseTelegramInitData', () => {
    it('should parse query string into object', () => {
      const initData = 'user=%7B%22id%22%3A123%7D&auth_date=1234567890&hash=abc123';
      const result = parseTelegramInitData(initData);
      
      expect(result.user).toBe('{"id":123}');
      expect(result.auth_date).toBe('1234567890');
      expect(result.hash).toBe('abc123');
    });

    it('should return empty object for empty string', () => {
      const result = parseTelegramInitData('');
      expect(result).toEqual({});
    });

    it('should handle multiple parameters', () => {
      const initData = 'query_id=test&user=%7B%7D&auth_date=123&start_param=ref123&hash=xyz';
      const result = parseTelegramInitData(initData);
      
      expect(result.query_id).toBe('test');
      expect(result.user).toBe('{}');
      expect(result.start_param).toBe('ref123');
      expect(result.hash).toBe('xyz');
    });

    it('should handle special characters in values', () => {
      const initData = 'user=%7B%22first_name%22%3A%22John%20Doe%22%7D&auth_date=123&hash=abc';
      const result = parseTelegramInitData(initData);
      
      expect(result.user).toBe('{"first_name":"John Doe"}');
    });
  });

  describe('generateDataCheckString', () => {
    it('should sort keys alphabetically and join with newlines', () => {
      const data: TelegramInitData = {
        user: '{"id":123}',
        auth_date: '1234567890',
        query_id: 'test',
        hash: 'shouldbeexcluded',
      };
      
      const result = generateDataCheckString(data);
      
      // Should be sorted: auth_date, query_id, user (hash excluded)
      expect(result).toBe('auth_date=1234567890\nquery_id=test\nuser={"id":123}');
    });

    it('should exclude hash from data check string', () => {
      const data: TelegramInitData = {
        auth_date: '123',
        hash: 'abc123',
      };
      
      const result = generateDataCheckString(data);
      expect(result).not.toContain('hash');
    });

    it('should handle single parameter', () => {
      const data: TelegramInitData = {
        auth_date: '123',
        hash: 'abc',
      };
      
      const result = generateDataCheckString(data);
      expect(result).toBe('auth_date=123');
    });

    it('should handle empty data object', () => {
      const result = generateDataCheckString({});
      expect(result).toBe('');
    });
  });

  describe('computeHmacSha256', () => {
    it('should compute HMAC-SHA256 hash', async () => {
      const key = 'test_key';
      const data = 'test_data';
      
      const result = await computeHmacSha256(key, data);
      
      // Should return hex string
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent output for same inputs', async () => {
      const key = 'consistent_key';
      const data = 'consistent_data';
      
      const result1 = await computeHmacSha256(key, data);
      const result2 = await computeHmacSha256(key, data);
      
      expect(result1).toBe(result2);
    });

    it('should produce different output for different keys', async () => {
      const data = 'same_data';
      
      const result1 = await computeHmacSha256('key1', data);
      const result2 = await computeHmacSha256('key2', data);
      
      expect(result1).not.toBe(result2);
    });

    it('should produce different output for different data', async () => {
      const key = 'same_key';
      
      const result1 = await computeHmacSha256(key, 'data1');
      const result2 = await computeHmacSha256(key, 'data2');
      
      expect(result1).not.toBe(result2);
    });
  });

  describe('createValidInitData', () => {
    it('should create properly signed initData', async () => {
      const data = {
        auth_date: String(Math.floor(Date.now() / 1000)),
        user: JSON.stringify({ id: 123, first_name: 'Test' }),
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      
      // Should be a valid query string
      expect(initData).toContain('auth_date=');
      expect(initData).toContain('user=');
      expect(initData).toContain('hash=');
    });

    it('should create initData that passes validation', async () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        auth_date: String(now),
        user: JSON.stringify({ id: 123, first_name: 'Test' }),
        query_id: 'test_query',
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const validation = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(validation.valid).toBe(true);
      expect(validation.user?.id).toBe(123);
      expect(validation.queryId).toBe('test_query');
    });
  });

  describe('validateTelegramInitData', () => {
    it('should return invalid for empty initData', async () => {
      const result = await validateTelegramInitData('', TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Empty initData');
    });

    it('should return invalid for missing hash', async () => {
      const initData = 'auth_date=123&user=%7B%7D';
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing hash');
    });

    it('should return invalid for missing auth_date', async () => {
      const initData = 'user=%7B%7D&hash=abc123';
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing auth_date');
    });

    it('should return invalid for expired auth_date', async () => {
      // Set auth_date to 48 hours ago
      const expiredTime = Math.floor(Date.now() / 1000) - (48 * 60 * 60);
      const data = {
        auth_date: String(expiredTime),
        user: JSON.stringify({ id: 123 }),
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Auth data expired');
    });

    it('should return invalid for tampered data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const initData = `auth_date=${now}&user=%7B%22id%22%3A123%7D&hash=tampered_hash`;
      
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should return invalid for wrong bot token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        auth_date: String(now),
        user: JSON.stringify({ id: 123 }),
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, 'wrong_bot_token');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should validate and return user data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const userData = {
        id: 12345,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        language_code: 'en',
        is_premium: true,
      };
      const data = {
        auth_date: String(now),
        user: JSON.stringify(userData),
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(true);
      expect(result.user).toEqual(userData);
      expect(result.authDate).toBe(now);
    });

    it('should validate with start_param', async () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        auth_date: String(now),
        user: JSON.stringify({ id: 123 }),
        start_param: 'referral_abc',
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(true);
      expect(result.startParam).toBe('referral_abc');
    });

    it('should handle invalid user JSON gracefully', async () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        auth_date: String(now),
        user: 'invalid-json',
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      // Should still be valid (signature is correct), but user is undefined
      expect(result.valid).toBe(true);
      expect(result.user).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle auth_date at exact 24 hour boundary', async () => {
      // Set auth_date to exactly 24 hours ago (should still be valid)
      const boundaryTime = Math.floor(Date.now() / 1000) - (24 * 60 * 60) + 10;
      const data = {
        auth_date: String(boundaryTime),
        user: JSON.stringify({ id: 123 }),
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(true);
    });

    it('should handle unicode characters in user data', async () => {
      const now = Math.floor(Date.now() / 1000);
      const userData = {
        id: 123,
        first_name: '日本語',
        last_name: 'Émilie',
      };
      const data = {
        auth_date: String(now),
        user: JSON.stringify(userData),
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(true);
      expect(result.user?.first_name).toBe('日本語');
      expect(result.user?.last_name).toBe('Émilie');
    });

    it('should handle empty user object', async () => {
      const now = Math.floor(Date.now() / 1000);
      const data = {
        auth_date: String(now),
        user: '{}',
      };
      
      const initData = await createValidInitData(data, TEST_BOT_TOKEN);
      const result = await validateTelegramInitData(initData, TEST_BOT_TOKEN);
      
      expect(result.valid).toBe(true);
      expect(result.user).toEqual({});
    });
  });
});
