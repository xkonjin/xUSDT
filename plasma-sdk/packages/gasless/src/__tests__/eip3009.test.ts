/**
 * EIP-3009 Tests
 * 
 * Tests for EIP-3009 Transfer With Authorization utilities
 * 
 * NOTE: All addresses in this test file (0x111...111, 0x222...222, etc.) are
 * FAKE TEST VALUES with intentionally repeating patterns. They are not real
 * addresses and have no value. Used only for unit testing.
 */

import {
  TRANSFER_WITH_AUTHORIZATION_TYPES,
  buildTransferAuthorizationTypedData,
  createTransferParams,
  validateTransferParams,
  getTimeUntilExpiry,
  isAuthorizationValid,
} from '../eip3009';

import {
  PLASMA_MAINNET_CHAIN_ID,
  USDT0_ADDRESS,
  USDT0_EIP712_DOMAIN,
} from '@plasma-pay/core';

import type { Address, Hex } from 'viem';

describe('TRANSFER_WITH_AUTHORIZATION_TYPES', () => {
  it('has correct type structure', () => {
    expect(TRANSFER_WITH_AUTHORIZATION_TYPES).toHaveProperty('TransferWithAuthorization');
  });

  it('has all required fields', () => {
    const fields = TRANSFER_WITH_AUTHORIZATION_TYPES.TransferWithAuthorization;
    const fieldNames = fields.map(f => f.name);
    
    expect(fieldNames).toContain('from');
    expect(fieldNames).toContain('to');
    expect(fieldNames).toContain('value');
    expect(fieldNames).toContain('validAfter');
    expect(fieldNames).toContain('validBefore');
    expect(fieldNames).toContain('nonce');
  });

  it('has correct field types', () => {
    const fields = TRANSFER_WITH_AUTHORIZATION_TYPES.TransferWithAuthorization;
    const fieldTypes = Object.fromEntries(fields.map(f => [f.name, f.type]));
    
    expect(fieldTypes.from).toBe('address');
    expect(fieldTypes.to).toBe('address');
    expect(fieldTypes.value).toBe('uint256');
    expect(fieldTypes.validAfter).toBe('uint256');
    expect(fieldTypes.validBefore).toBe('uint256');
    expect(fieldTypes.nonce).toBe('bytes32');
  });
});

describe('buildTransferAuthorizationTypedData', () => {
  const mockParams = {
    from: '0x1111111111111111111111111111111111111111' as Address,
    to: '0x2222222222222222222222222222222222222222' as Address,
    value: 1000000n,
    validAfter: 1000,
    validBefore: 2000,
    nonce: '0x' + 'a'.repeat(64) as Hex,
  };

  it('builds typed data with default options', () => {
    const typedData = buildTransferAuthorizationTypedData(mockParams);
    
    expect(typedData.domain.chainId).toBe(PLASMA_MAINNET_CHAIN_ID);
    expect(typedData.domain.verifyingContract).toBe(USDT0_ADDRESS);
    expect(typedData.domain.name).toBe(USDT0_EIP712_DOMAIN.name);
    expect(typedData.domain.version).toBe(USDT0_EIP712_DOMAIN.version);
  });

  it('builds typed data with custom options', () => {
    const customTokenAddress = '0x3333333333333333333333333333333333333333' as Address;
    const typedData = buildTransferAuthorizationTypedData(mockParams, {
      chainId: 1,
      tokenAddress: customTokenAddress,
      tokenName: 'CustomToken',
      tokenVersion: '2',
    });
    
    expect(typedData.domain.chainId).toBe(1);
    expect(typedData.domain.verifyingContract).toBe(customTokenAddress);
    expect(typedData.domain.name).toBe('CustomToken');
    expect(typedData.domain.version).toBe('2');
  });

  it('includes correct message fields', () => {
    const typedData = buildTransferAuthorizationTypedData(mockParams);
    
    expect(typedData.message.from).toBe(mockParams.from);
    expect(typedData.message.to).toBe(mockParams.to);
    expect(typedData.message.value).toBe(mockParams.value.toString());
    expect(typedData.message.validAfter).toBe(mockParams.validAfter.toString());
    expect(typedData.message.validBefore).toBe(mockParams.validBefore.toString());
    expect(typedData.message.nonce).toBe(mockParams.nonce);
  });

  it('has correct primaryType', () => {
    const typedData = buildTransferAuthorizationTypedData(mockParams);
    expect(typedData.primaryType).toBe('TransferWithAuthorization');
  });

  it('has correct types', () => {
    const typedData = buildTransferAuthorizationTypedData(mockParams);
    expect(typedData.types).toBe(TRANSFER_WITH_AUTHORIZATION_TYPES);
  });
});

describe('createTransferParams', () => {
  const from = '0x1111111111111111111111111111111111111111' as Address;
  const to = '0x2222222222222222222222222222222222222222' as Address;
  const value = 1000000n;

  it('creates params with defaults', () => {
    const params = createTransferParams(from, to, value);
    
    expect(params.from).toBe(from);
    expect(params.to).toBe(to);
    expect(params.value).toBe(value);
    expect(params.nonce).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(params.validBefore).toBeGreaterThan(params.validAfter);
  });

  it('uses provided validity window', () => {
    const params = createTransferParams(from, to, value, {
      validAfter: 1000,
      validBefore: 2000,
    });
    
    expect(params.validAfter).toBe(1000);
    expect(params.validBefore).toBe(2000);
  });

  it('uses provided nonce', () => {
    const customNonce = '0x' + 'b'.repeat(64) as Hex;
    const params = createTransferParams(from, to, value, {
      nonce: customNonce,
    });
    
    expect(params.nonce).toBe(customNonce);
  });

  it('uses custom validity period', () => {
    const params = createTransferParams(from, to, value, {
      validityPeriod: 7200, // 2 hours
    });
    
    expect(params.validBefore - params.validAfter).toBe(7200);
  });

  it('generates unique nonces', () => {
    const params1 = createTransferParams(from, to, value);
    const params2 = createTransferParams(from, to, value);
    
    expect(params1.nonce).not.toBe(params2.nonce);
  });
});

describe('validateTransferParams', () => {
  const now = Math.floor(Date.now() / 1000);
  
  const validParams = {
    from: '0x1111111111111111111111111111111111111111' as Address,
    to: '0x2222222222222222222222222222222222222222' as Address,
    value: 1000000n,
    validAfter: now - 100,
    validBefore: now + 3600,
    nonce: '0x' + 'a'.repeat(64) as Hex,
  };

  it('validates correct params', () => {
    const result = validateTransferParams(validParams);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects zero from address', () => {
    const result = validateTransferParams({
      ...validParams,
      from: '0x0000000000000000000000000000000000000000' as Address,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid from address');
  });

  it('rejects zero to address', () => {
    const result = validateTransferParams({
      ...validParams,
      to: '0x0000000000000000000000000000000000000000' as Address,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid to address');
  });

  it('rejects same from and to address', () => {
    const result = validateTransferParams({
      ...validParams,
      to: validParams.from,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('From and to addresses cannot be the same');
  });

  it('rejects zero or negative value', () => {
    const result = validateTransferParams({
      ...validParams,
      value: 0n,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Value must be greater than 0');
  });

  it('rejects validBefore <= validAfter', () => {
    const result = validateTransferParams({
      ...validParams,
      validAfter: 2000,
      validBefore: 1000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('validBefore must be greater than validAfter');
  });

  it('rejects not yet valid authorization', () => {
    const result = validateTransferParams({
      ...validParams,
      validAfter: now + 1000,
      validBefore: now + 2000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Authorization is not yet valid');
  });

  it('rejects expired authorization', () => {
    const result = validateTransferParams({
      ...validParams,
      validAfter: now - 2000,
      validBefore: now - 1000,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Authorization has expired');
  });

  it('rejects invalid nonce format', () => {
    const result = validateTransferParams({
      ...validParams,
      nonce: '0x123' as Hex,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid nonce format (must be bytes32)');
  });

  it('collects multiple errors', () => {
    const result = validateTransferParams({
      ...validParams,
      from: '0x0000000000000000000000000000000000000000' as Address,
      to: '0x0000000000000000000000000000000000000000' as Address,
      value: 0n,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('getTimeUntilExpiry', () => {
  it('returns positive time for future expiry', () => {
    const now = Math.floor(Date.now() / 1000);
    const validBefore = now + 3600;
    
    const timeUntil = getTimeUntilExpiry(validBefore);
    expect(timeUntil).toBeGreaterThan(0);
    expect(timeUntil).toBeLessThanOrEqual(3600);
  });

  it('returns 0 for past expiry', () => {
    const now = Math.floor(Date.now() / 1000);
    const validBefore = now - 100;
    
    const timeUntil = getTimeUntilExpiry(validBefore);
    expect(timeUntil).toBe(0);
  });

  it('returns 0 for current time expiry', () => {
    const now = Math.floor(Date.now() / 1000);
    
    const timeUntil = getTimeUntilExpiry(now);
    expect(timeUntil).toBe(0);
  });
});

describe('isAuthorizationValid', () => {
  const now = Math.floor(Date.now() / 1000);

  it('returns true for currently valid authorization', () => {
    const params = {
      from: '0x1111111111111111111111111111111111111111' as Address,
      to: '0x2222222222222222222222222222222222222222' as Address,
      value: 1000000n,
      validAfter: now - 100,
      validBefore: now + 3600,
      nonce: '0x' + 'a'.repeat(64) as Hex,
    };
    
    expect(isAuthorizationValid(params)).toBe(true);
  });

  it('returns false for not yet valid authorization', () => {
    const params = {
      from: '0x1111111111111111111111111111111111111111' as Address,
      to: '0x2222222222222222222222222222222222222222' as Address,
      value: 1000000n,
      validAfter: now + 100,
      validBefore: now + 3600,
      nonce: '0x' + 'a'.repeat(64) as Hex,
    };
    
    expect(isAuthorizationValid(params)).toBe(false);
  });

  it('returns false for expired authorization', () => {
    const params = {
      from: '0x1111111111111111111111111111111111111111' as Address,
      to: '0x2222222222222222222222222222222222222222' as Address,
      value: 1000000n,
      validAfter: now - 3600,
      validBefore: now - 100,
      nonce: '0x' + 'a'.repeat(64) as Hex,
    };
    
    expect(isAuthorizationValid(params)).toBe(false);
  });
});
