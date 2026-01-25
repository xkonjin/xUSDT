/**
 * Tests for Relayer Wallet Management
 */

import {
  getRelayerAddress,
  parseRotationConfigFromEnv,
} from '../relayer-wallet';

// Mock validation module
jest.mock('../validation', () => ({
  validatePrivateKey: jest.fn((key: string) => {
    if (!key) return { valid: false, key: '', error: 'Private key is not set' };
    if (key.length < 64) return { valid: false, key: '', error: 'Invalid length' };
    // Accept any 64+ char hex string for testing
    const hexPart = key.startsWith('0x') ? key.slice(2) : key;
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      return { valid: false, key: '', error: 'Invalid hex' };
    }
    return { valid: true, key: key.startsWith('0x') ? key : `0x${key}` };
  }),
}));

// Mock viem
jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn((key: string) => ({
    address: '0x1234567890123456789012345678901234567890' as const,
  })),
}));

describe('relayer-wallet', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getRelayerAddress', () => {
    it('returns null when RELAYER_PRIVATE_KEY is not set', () => {
      delete process.env.RELAYER_PRIVATE_KEY;
      const address = getRelayerAddress();
      expect(address).toBeNull();
    });

    it('returns address when RELAYER_PRIVATE_KEY is valid', () => {
      process.env.RELAYER_PRIVATE_KEY = '0x' + 'a'.repeat(64);
      const address = getRelayerAddress();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('parseRotationConfigFromEnv', () => {
    it('returns null when no wallets configured', () => {
      delete process.env.RELAYER_PRIVATE_KEY;
      delete process.env.RELAYER_WALLETS;
      const config = parseRotationConfigFromEnv();
      expect(config).toBeNull();
    });

    it('returns single wallet config from RELAYER_PRIVATE_KEY', () => {
      process.env.RELAYER_PRIVATE_KEY = '0x' + 'b'.repeat(64);
      process.env.RELAYER_WALLET_LABEL = 'test-wallet';
      delete process.env.RELAYER_WALLETS;

      const config = parseRotationConfigFromEnv();
      expect(config).not.toBeNull();
      expect(config?.wallets).toHaveLength(1);
      expect(config?.wallets[0].label).toBe('test-wallet');
      expect(config?.strategy).toBe('round-robin');
    });

    it('parses multiple wallets from RELAYER_WALLETS', () => {
      const key1 = '0x' + 'c'.repeat(64);
      const key2 = '0x' + 'd'.repeat(64);
      process.env.RELAYER_WALLETS = `primary:${key1},backup:${key2}`;
      process.env.RELAYER_ROTATION_STRATEGY = 'highest-balance';

      const config = parseRotationConfigFromEnv();
      expect(config).not.toBeNull();
      expect(config?.wallets).toHaveLength(2);
      expect(config?.wallets[0].label).toBe('primary');
      expect(config?.wallets[1].label).toBe('backup');
      expect(config?.strategy).toBe('highest-balance');
    });

    it('skips invalid wallet keys', () => {
      const validKey = '0x' + 'e'.repeat(64);
      process.env.RELAYER_WALLETS = `good:${validKey},bad:invalid`;

      const config = parseRotationConfigFromEnv();
      expect(config).not.toBeNull();
      expect(config?.wallets).toHaveLength(1);
      expect(config?.wallets[0].label).toBe('good');
    });
  });
});
