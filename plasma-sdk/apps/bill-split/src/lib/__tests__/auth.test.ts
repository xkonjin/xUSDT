/**
 * Auth Module Tests
 * 
 * Tests for Privy JWT verification and user extraction.
 */

// Mock @privy-io/server-auth before importing auth module
const mockVerifyAuthToken = jest.fn();

jest.mock('@privy-io/server-auth', () => ({
  PrivyClient: jest.fn().mockImplementation(() => ({
    verifyAuthToken: mockVerifyAuthToken,
  })),
}));

// Import after mock setup
import { verifyPrivyToken, extractBearerToken, getAuthenticatedUser, AuthError } from '../auth';

describe('Auth Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.PRIVY_APP_ID = 'test-app-id';
    process.env.PRIVY_APP_SECRET = 'test-app-secret';
    // Reset default mock behavior
    mockVerifyAuthToken.mockResolvedValue({
      userId: 'did:privy:12345',
      appId: 'test-app-id',
    });
  });

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractBearerToken('Bearer my-valid-token');
      expect(token).toBe('my-valid-token');
    });

    it('should return null for missing header', () => {
      const token = extractBearerToken(null);
      expect(token).toBeNull();
    });

    it('should return null for empty header', () => {
      const token = extractBearerToken('');
      expect(token).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const token = extractBearerToken('Basic abc123');
      expect(token).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      const token = extractBearerToken('Bearer ');
      expect(token).toBeNull();
    });

    it('should handle lowercase bearer', () => {
      const token = extractBearerToken('bearer my-token');
      expect(token).toBe('my-token');
    });
  });

  describe('verifyPrivyToken', () => {
    it('should verify valid token and return user info', async () => {
      // Default mock already configured in beforeEach
      const result = await verifyPrivyToken('valid-token');
      
      expect(result).toEqual({
        userId: 'did:privy:12345',
        appId: 'test-app-id',
      });
      expect(mockVerifyAuthToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw AuthError for invalid token', async () => {
      mockVerifyAuthToken.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(verifyPrivyToken('invalid-token')).rejects.toThrow(AuthError);
    });

    it('should throw AuthError when Privy is not configured', async () => {
      // Need to reset module to clear cached client
      jest.resetModules();
      jest.doMock('@privy-io/server-auth', () => ({
        PrivyClient: jest.fn(),
      }));
      
      // Re-import with fresh module state
      const { verifyPrivyToken: freshVerify, AuthError: FreshAuthError } = require('../auth');
      
      delete process.env.PRIVY_APP_ID;
      delete process.env.PRIVY_APP_SECRET;

      await expect(freshVerify('any-token')).rejects.toThrow(FreshAuthError);
    });
  });

  describe('getAuthenticatedUser', () => {
    it('should return user info for valid request', async () => {
      // Default mock already configured in beforeEach

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer valid-token'),
        },
      } as unknown as Request;

      const result = await getAuthenticatedUser(mockRequest);
      
      expect(result).toEqual({
        userId: 'did:privy:12345',
        appId: 'test-app-id',
      });
    });

    it('should return null for missing Authorization header', async () => {
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue(null),
        },
      } as unknown as Request;

      const result = await getAuthenticatedUser(mockRequest);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid token', async () => {
      mockVerifyAuthToken.mockRejectedValueOnce(new Error('Invalid token'));

      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Bearer invalid-token'),
        },
      } as unknown as Request;

      const result = await getAuthenticatedUser(mockRequest);
      
      expect(result).toBeNull();
    });
  });

  describe('AuthError', () => {
    it('should be an instance of Error', () => {
      const error = new AuthError('test message');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthError');
      expect(error.message).toBe('test message');
    });

    it('should have correct status code', () => {
      const error = new AuthError('test', 403);
      expect(error.statusCode).toBe(403);
    });

    it('should default to 401 status code', () => {
      const error = new AuthError('test');
      expect(error.statusCode).toBe(401);
    });
  });
});
