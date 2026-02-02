/**
 * Plasma Chain Constants
 */

// Chain IDs
export const PLASMA_MAINNET_CHAIN_ID = 98866;
export const PLASMA_TESTNET_CHAIN_ID = 9746;

// RPC URLs
export const PLASMA_MAINNET_RPC = 'https://rpc.plasma.to';
export const PLASMA_TESTNET_RPC = 'https://rpc-testnet.plasma.to';

// Block Explorer
export const PLASMA_EXPLORER_URL = 'https://explorer.plasma.to';

// Token Addresses - USDT0 (Tether USD on Plasma)
export const USDT0_ADDRESS = '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb' as const;
export const USDT0_DECIMALS = 6;
export const USDT0_SYMBOL = 'USDT0';
export const USDT0_NAME = 'USD₮0';

// Native Token - XPL
export const XPL_DECIMALS = 18;
export const XPL_SYMBOL = 'XPL';

// EIP-712 Domain for USDT0
// IMPORTANT: The contract returns "USDT0" as the token name, not "USD₮0"
// Using the wrong name causes EIP-3009 signature validation to fail
export const USDT0_EIP712_DOMAIN = {
  name: 'USDT0',
  version: '1',
} as const;

// EIP-3009 Type Hash
export const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = 
  '0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267' as const;

// Default Platform Fee (10 basis points = 0.1%)
export const DEFAULT_PLATFORM_FEE_BPS = 10;

// Default Validity Period (1 hour in seconds)
export const DEFAULT_VALIDITY_PERIOD = 3600;

// Minimum Transfer Amount (in atomic units)
export const MIN_TRANSFER_AMOUNT = 1000n; // 0.001 USDT0

// Zero Address (burn address / null recipient)
export const ZERO_ADDRESS = ('0x' + '0'.repeat(40)) as `0x${string}`;
