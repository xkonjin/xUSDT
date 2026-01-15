/**
 * Signer Tests
 * 
 * Tests for EIP-3009 signing utilities
 */

import {
  createSigner,
  createSignerFromKey,
} from '../signer';

import { createTransferParams } from '../eip3009';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { plasmaMainnet } from '@plasma-pay/core';

import type { Address, Hex } from 'viem';

// FAKE TEST KEY - This is a deterministic test key with no value, used only for unit tests
// It is intentionally a repeating pattern to make it obvious it's not a real key
const TEST_PRIVATE_KEY = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;

describe('createSignerFromKey', () => {
  it('creates signer from private key', () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    
    expect(signer).toHaveProperty('sign');
    expect(signer).toHaveProperty('transfer');
    expect(signer).toHaveProperty('address');
  });

  it('derives correct address from private key', () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const account = privateKeyToAccount(TEST_PRIVATE_KEY);
    
    expect(signer.address).toBe(account.address);
  });

  it('address is a valid Ethereum address', () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    
    expect(signer.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

describe('createSigner', () => {
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: plasmaMainnet,
    transport: http(),
  });

  it('creates signer from wallet client', () => {
    const signer = createSigner(walletClient);
    
    expect(signer).toHaveProperty('sign');
    expect(signer).toHaveProperty('transfer');
    expect(signer).toHaveProperty('address');
  });

  it('returns correct address', () => {
    const signer = createSigner(walletClient);
    
    expect(signer.address).toBe(account.address);
  });

  it('throws if wallet client has no account', () => {
    const clientWithoutAccount = createWalletClient({
      chain: plasmaMainnet,
      transport: http(),
    });

    const signer = createSigner(clientWithoutAccount);
    
    expect(() => signer.address).toThrow('WalletClient must have an account');
  });
});

describe('signer.sign', () => {
  it('signs transfer params and returns signature', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    const params = createTransferParams(signer.address, to, 1000000n);
    const signed = await signer.sign(params);
    
    expect(signed).toHaveProperty('signature');
    expect(signed).toHaveProperty('v');
    expect(signed).toHaveProperty('r');
    expect(signed).toHaveProperty('s');
  });

  it('signature is valid hex format', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    const params = createTransferParams(signer.address, to, 1000000n);
    const signed = await signer.sign(params);
    
    expect(signed.signature).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(signed.r).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(signed.s).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('v is 27 or 28', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    const params = createTransferParams(signer.address, to, 1000000n);
    const signed = await signer.sign(params);
    
    expect([27, 28]).toContain(signed.v);
  });

  it('preserves original params in signed result', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    const value = 1000000n;
    
    const params = createTransferParams(signer.address, to, value);
    const signed = await signer.sign(params);
    
    expect(signed.from).toBe(params.from);
    expect(signed.to).toBe(params.to);
    expect(signed.value).toBe(params.value);
    expect(signed.validAfter).toBe(params.validAfter);
    expect(signed.validBefore).toBe(params.validBefore);
    expect(signed.nonce).toBe(params.nonce);
  });
});

describe('signer.transfer', () => {
  it('creates and signs transfer in one call', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    const value = 1000000n;
    
    const signed = await signer.transfer(to, value);
    
    expect(signed.from).toBe(signer.address);
    expect(signed.to).toBe(to);
    expect(signed.value).toBe(value);
    expect(signed).toHaveProperty('signature');
  });

  it('accepts custom validity period', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    const signed = await signer.transfer(to, 1000000n, {
      validityPeriod: 7200,
    });
    
    expect(signed.validBefore - signed.validAfter).toBe(7200);
  });

  it('accepts custom nonce', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    const customNonce = '0x' + 'b'.repeat(64) as Hex;
    
    const signed = await signer.transfer(to, 1000000n, {
      nonce: customNonce,
    });
    
    expect(signed.nonce).toBe(customNonce);
  });
});

describe('SignerConfig', () => {
  it('accepts custom chainId', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY, {
      chainId: 1,
    });
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    // Should not throw - chainId is used in typed data
    const signed = await signer.transfer(to, 1000000n);
    expect(signed.signature).toBeDefined();
  });

  it('accepts custom token address', async () => {
    const customToken = '0x3333333333333333333333333333333333333333' as Address;
    const signer = createSignerFromKey(TEST_PRIVATE_KEY, {
      tokenAddress: customToken,
    });
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    // Should not throw - tokenAddress is used in typed data
    const signed = await signer.transfer(to, 1000000n);
    expect(signed.signature).toBeDefined();
  });

  it('accepts custom token name and version', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY, {
      tokenName: 'CustomToken',
      tokenVersion: '2',
    });
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    // Should not throw - tokenName/version are used in typed data
    const signed = await signer.transfer(to, 1000000n);
    expect(signed.signature).toBeDefined();
  });
});

describe('signature consistency', () => {
  it('produces same signature for same params', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    const nonce = '0x' + 'c'.repeat(64) as Hex;
    
    const now = Math.floor(Date.now() / 1000);
    const params = {
      from: signer.address,
      to,
      value: 1000000n,
      validAfter: now,
      validBefore: now + 3600,
      nonce,
    };
    
    const signed1 = await signer.sign(params);
    const signed2 = await signer.sign(params);
    
    expect(signed1.signature).toBe(signed2.signature);
    expect(signed1.v).toBe(signed2.v);
    expect(signed1.r).toBe(signed2.r);
    expect(signed1.s).toBe(signed2.s);
  });

  it('produces different signature for different nonces', async () => {
    const signer = createSignerFromKey(TEST_PRIVATE_KEY);
    const to = '0x2222222222222222222222222222222222222222' as Address;
    
    const now = Math.floor(Date.now() / 1000);
    const baseParams = {
      from: signer.address,
      to,
      value: 1000000n,
      validAfter: now,
      validBefore: now + 3600,
    };
    
    const params1 = { ...baseParams, nonce: '0x' + 'c'.repeat(64) as Hex };
    const params2 = { ...baseParams, nonce: '0x' + 'd'.repeat(64) as Hex };
    
    const signed1 = await signer.sign(params1);
    const signed2 = await signer.sign(params2);
    
    expect(signed1.signature).not.toBe(signed2.signature);
  });
});
