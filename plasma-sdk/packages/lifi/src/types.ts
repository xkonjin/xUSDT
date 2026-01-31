/**
 * @plasma-pay/lifi - Type definitions
 * 
 * Types for cross-chain swaps and bridging to Plasma
 */

import type { Address, Hex } from 'viem';

// ============================================================================
// Configuration Types
// ============================================================================

export interface LiFiConfig {
  /**
   * LiFi integrator name for tracking
   * @default "PlasmaPaySDK"
   */
  integrator?: string;

  /**
   * Slippage tolerance in percentage (0.5 = 0.5%)
   * @default 0.5
   */
  slippage?: number;

  /**
   * Maximum price impact allowed in percentage
   * @default 2
   */
  maxPriceImpact?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Custom RPC URLs for specific chains
   */
  rpcUrls?: Record<number, string>;
}

// ============================================================================
// Swap Types
// ============================================================================

export interface SwapRequest {
  /**
   * Source chain ID
   */
  fromChainId: number;

  /**
   * Source token address (use native address for native tokens)
   */
  fromToken: Address;

  /**
   * Amount to swap in atomic units
   */
  fromAmount: string;

  /**
   * User's address on source chain
   */
  fromAddress: Address;

  /**
   * Destination chain ID
   * @default 9745 (Plasma)
   */
  toChainId?: number;

  /**
   * Destination token address
   * @default USDT0 on Plasma
   */
  toToken?: Address;

  /**
   * Recipient address on destination chain
   * @default fromAddress
   */
  toAddress?: Address;
}

export interface SwapQuote {
  /**
   * Unique quote ID
   */
  id: string;

  /**
   * Source chain and token info
   */
  from: {
    chainId: number;
    token: Address;
    amount: string;
    amountFormatted: string;
    symbol: string;
  };

  /**
   * Destination chain and token info
   */
  to: {
    chainId: number;
    token: Address;
    amount: string;
    amountFormatted: string;
    symbol: string;
  };

  /**
   * Estimated execution time in seconds
   */
  estimatedTime: number;

  /**
   * Gas cost estimate in USD
   */
  gasCostUsd: string;

  /**
   * Price impact percentage
   */
  priceImpact: number;

  /**
   * Exchange rate (to/from)
   */
  exchangeRate: string;

  /**
   * Route steps
   */
  steps: SwapStep[];

  /**
   * Raw LiFi route data (for execution)
   */
  rawRoute: unknown;
}

export interface SwapStep {
  type: 'swap' | 'bridge' | 'cross';
  tool: string;
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  estimatedTime: number;
}

export interface SwapResult {
  /**
   * Transaction hash on source chain
   */
  sourceTxHash: Hex;

  /**
   * Transaction hash on destination chain (for bridges)
   */
  destinationTxHash?: Hex;

  /**
   * Final status
   */
  status: 'success' | 'pending' | 'failed';

  /**
   * Amount received on destination
   */
  amountReceived?: string;

  /**
   * Error message if failed
   */
  error?: string;
}

// ============================================================================
// Token Types
// ============================================================================

export interface TokenInfo {
  address: Address;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUsd?: string;
}

export interface ChainInfo {
  id: number;
  name: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  logoURI?: string;
}

// ============================================================================
// Constants
// ============================================================================

export const PLASMA_CHAIN_ID = 9745;
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
export const USDT0_ADDRESS_PLASMA = '0x0000000000000000000000000000000000000000' as Address; // TODO: Replace

/**
 * Common token addresses on popular chains
 */
export const COMMON_TOKENS: Record<number, Record<string, Address>> = {
  // Ethereum
  1: {
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    DAI: '0x6B175474E89094C44Da98b954EescdeCB5BE3830',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    ETH: NATIVE_TOKEN_ADDRESS,
  },
  // Base
  8453: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    WETH: '0x4200000000000000000000000000000000000006',
    ETH: NATIVE_TOKEN_ADDRESS,
  },
  // Arbitrum
  42161: {
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    ETH: NATIVE_TOKEN_ADDRESS,
  },
  // Optimism
  10: {
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    WETH: '0x4200000000000000000000000000000000000006',
    ETH: NATIVE_TOKEN_ADDRESS,
  },
  // Polygon
  137: {
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    MATIC: NATIVE_TOKEN_ADDRESS,
  },
  // Plasma
  9745: {
    USDT0: USDT0_ADDRESS_PLASMA,
    XPL: NATIVE_TOKEN_ADDRESS,
  },
};

/**
 * Supported source chains for swaps to Plasma
 */
export const SUPPORTED_SOURCE_CHAINS = [1, 8453, 42161, 10, 137, 56, 43114];

// ============================================================================
// LiFi OUT Types - Send payments in any currency
// ============================================================================

export interface SendRequest {
  /**
   * Recipient address on destination chain
   */
  to: Address;

  /**
   * Amount to send in USDT0 (will be converted)
   */
  amount: string;

  /**
   * Destination chain ID
   * @default Plasma (prefer Plasma)
   */
  toChainId?: number;

  /**
   * Destination token (what recipient receives)
   * @default USDT0 on Plasma, or native token on other chains
   */
  toToken?: Address;

  /**
   * Optional note/memo for the payment
   */
  note?: string;

  /**
   * Whether to prefer Plasma when possible
   * @default true
   */
  preferPlasma?: boolean;
}

export interface SendQuote {
  /**
   * Unique quote ID
   */
  id: string;

  /**
   * What sender pays (USDT0 on Plasma)
   */
  senderPays: {
    chainId: number;
    token: Address;
    amount: string;
    amountFormatted: string;
    symbol: string;
  };

  /**
   * What recipient receives
   */
  recipientReceives: {
    chainId: number;
    token: Address;
    amount: string;
    amountFormatted: string;
    symbol: string;
  };

  /**
   * Fee breakdown
   */
  fees: {
    bridgeFee: string;
    gasFee: string;
    totalFee: string;
    totalFeeUsd: string;
  };

  /**
   * Estimated time in seconds
   */
  estimatedTime: number;

  /**
   * Whether this uses Plasma (no bridge needed)
   */
  isPlasmaOnly: boolean;

  /**
   * Route steps
   */
  steps: SwapStep[];

  /**
   * Raw route data
   */
  rawRoute: unknown;
}

export interface SendResult {
  /**
   * Transaction hash on source chain (Plasma)
   */
  sourceTxHash: Hex;

  /**
   * Transaction hash on destination chain (if bridged)
   */
  destinationTxHash?: Hex;

  /**
   * Final status
   */
  status: 'success' | 'pending' | 'failed';

  /**
   * Amount received by recipient
   */
  amountReceived?: string;

  /**
   * Recipient address
   */
  recipient: Address;

  /**
   * Destination chain
   */
  destinationChain: number;

  /**
   * Error message if failed
   */
  error?: string;
}

/**
 * Supported destination chains for LiFi OUT
 */
export const SUPPORTED_DESTINATION_CHAINS = [1, 8453, 42161, 10, 137, 56, 43114, PLASMA_CHAIN_ID];
