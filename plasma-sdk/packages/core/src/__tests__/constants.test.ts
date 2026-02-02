/**
 * Constants Tests
 * 
 * Validates all exported constants from @plasma-pay/core
 */

import {
  PLASMA_MAINNET_CHAIN_ID,
  PLASMA_TESTNET_CHAIN_ID,
  PLASMA_MAINNET_RPC,
  PLASMA_TESTNET_RPC,
  PLASMA_EXPLORER_URL,
  USDT0_ADDRESS,
  USDT0_DECIMALS,
  USDT0_SYMBOL,
  USDT0_NAME,
  XPL_DECIMALS,
  XPL_SYMBOL,
  USDT0_EIP712_DOMAIN,
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
  DEFAULT_PLATFORM_FEE_BPS,
  DEFAULT_VALIDITY_PERIOD,
  MIN_TRANSFER_AMOUNT,
  ZERO_ADDRESS,
} from '../constants';

describe('Chain IDs', () => {
  it('PLASMA_MAINNET_CHAIN_ID is correct', () => {
    expect(PLASMA_MAINNET_CHAIN_ID).toBe(98866);
    expect(typeof PLASMA_MAINNET_CHAIN_ID).toBe('number');
  });

  it('PLASMA_TESTNET_CHAIN_ID is correct', () => {
    expect(PLASMA_TESTNET_CHAIN_ID).toBe(9746);
    expect(typeof PLASMA_TESTNET_CHAIN_ID).toBe('number');
  });

  it('chain IDs are different', () => {
    expect(PLASMA_MAINNET_CHAIN_ID).not.toBe(PLASMA_TESTNET_CHAIN_ID);
  });
});

describe('RPC URLs', () => {
  it('PLASMA_MAINNET_RPC is valid URL', () => {
    expect(PLASMA_MAINNET_RPC).toBe('https://rpc.plasma.to');
    expect(PLASMA_MAINNET_RPC).toMatch(/^https:\/\//);
  });

  it('PLASMA_TESTNET_RPC is valid URL', () => {
    expect(PLASMA_TESTNET_RPC).toBe('https://rpc-testnet.plasma.to');
    expect(PLASMA_TESTNET_RPC).toMatch(/^https:\/\//);
  });

  it('testnet RPC contains testnet identifier', () => {
    expect(PLASMA_TESTNET_RPC).toContain('testnet');
  });
});

describe('Explorer URL', () => {
  it('PLASMA_EXPLORER_URL is valid URL', () => {
    expect(PLASMA_EXPLORER_URL).toBe('https://explorer.plasma.to');
    expect(PLASMA_EXPLORER_URL).toMatch(/^https:\/\//);
  });
});

describe('USDT0 Token Constants', () => {
  it('USDT0_ADDRESS is valid Ethereum address', () => {
    expect(USDT0_ADDRESS).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(USDT0_ADDRESS).toBe('0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb');
  });

  it('USDT0_DECIMALS is 6 (standard stablecoin decimals)', () => {
    expect(USDT0_DECIMALS).toBe(6);
  });

  it('USDT0_SYMBOL is correct', () => {
    expect(USDT0_SYMBOL).toBe('USDT0');
  });

  it('USDT0_NAME is correct', () => {
    expect(USDT0_NAME).toBe('USD₮0');
  });
});

describe('XPL Native Token Constants', () => {
  it('XPL_DECIMALS is 18 (standard EVM decimals)', () => {
    expect(XPL_DECIMALS).toBe(18);
  });

  it('XPL_SYMBOL is correct', () => {
    expect(XPL_SYMBOL).toBe('XPL');
  });
});

describe('EIP-712 Domain', () => {
  it('USDT0_EIP712_DOMAIN has correct structure', () => {
    expect(USDT0_EIP712_DOMAIN).toHaveProperty('name');
    expect(USDT0_EIP712_DOMAIN).toHaveProperty('version');
  });

  it('USDT0_EIP712_DOMAIN name matches contract (USDT0, not USD₮0)', () => {
    // The contract returns "USDT0" as the token name for EIP-712
    expect(USDT0_EIP712_DOMAIN.name).toBe('USDT0');
  });

  it('USDT0_EIP712_DOMAIN version is 1', () => {
    expect(USDT0_EIP712_DOMAIN.version).toBe('1');
  });
});

describe('EIP-3009 Constants', () => {
  it('TRANSFER_WITH_AUTHORIZATION_TYPEHASH is valid bytes32', () => {
    expect(TRANSFER_WITH_AUTHORIZATION_TYPEHASH).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });
});

describe('Default Values', () => {
  it('DEFAULT_PLATFORM_FEE_BPS is 10 (0.1%)', () => {
    expect(DEFAULT_PLATFORM_FEE_BPS).toBe(10);
    expect(DEFAULT_PLATFORM_FEE_BPS).toBeLessThanOrEqual(10000); // Max 100%
  });

  it('DEFAULT_VALIDITY_PERIOD is 1 hour in seconds', () => {
    expect(DEFAULT_VALIDITY_PERIOD).toBe(3600);
    expect(DEFAULT_VALIDITY_PERIOD).toBe(60 * 60);
  });

  it('MIN_TRANSFER_AMOUNT is 0.001 USDT0 in atomic units', () => {
    expect(MIN_TRANSFER_AMOUNT).toBe(1000n);
    expect(typeof MIN_TRANSFER_AMOUNT).toBe('bigint');
  });
});

describe('ZERO_ADDRESS', () => {
  it('ZERO_ADDRESS is all zeros', () => {
    expect(ZERO_ADDRESS).toBe('0x0000000000000000000000000000000000000000');
  });

  it('ZERO_ADDRESS has correct length', () => {
    expect(ZERO_ADDRESS.length).toBe(42); // 0x + 40 hex chars
  });

  it('ZERO_ADDRESS is typed as hex string', () => {
    expect(ZERO_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});
