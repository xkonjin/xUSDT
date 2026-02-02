/**
 * @plasma-pay/agent - Chain Definitions
 * 
 * Viem chain definitions for Plasma and supported networks
 * 
 * Based on baghdadgherras/x402-usdt0 configuration
 */

import { defineChain } from 'viem';

/**
 * Plasma Mainnet Chain Definition
 * Chain ID: 98866
 */
export const plasma = defineChain({
  id: 98866,
  name: 'Plasma',
  nativeCurrency: {
    decimals: 18,
    name: 'Plasma',
    symbol: 'XPL',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.plasma.io'],
    },
    public: {
      http: ['https://rpc.plasma.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Plasma Explorer',
      url: 'https://explorer.plasma.io',
    },
  },
  contracts: {
    // USDT0 contract address on Plasma
    usdt0: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`, // USDT0 on Plasma
    },
  },
});

/**
 * Plasma Testnet Chain Definition (if available)
 */
export const plasmaTestnet = defineChain({
  id: 98867, // Testnet chain ID (placeholder)
  name: 'Plasma Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Plasma',
    symbol: 'XPL',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-testnet.plasma.io'],
    },
    public: {
      http: ['https://rpc-testnet.plasma.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Plasma Testnet Explorer',
      url: 'https://explorer-testnet.plasma.io',
    },
  },
  testnet: true,
});

/**
 * Supported chain IDs
 */
export const SUPPORTED_CHAINS = {
  plasma: 98866,
  plasmaTestnet: 98867,
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  avalanche: 43114,
  bsc: 56,
} as const;

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

/**
 * USDT0 / Stablecoin addresses on different chains
 * 
 * Note: USDT0 is Plasma's native stablecoin with EIP-3009 support
 */
export const USDT0_ADDRESSES: Record<number, `0x${string}`> = {
  // Plasma Mainnet - USDT0
  98866: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // TODO: Replace with actual USDT0 address
  
  // Ethereum Mainnet - USDC (EIP-3009 compatible)
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  
  // Base - USDC
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  
  // Arbitrum - USDC
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  
  // Optimism - USDC
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  
  // Polygon - USDC
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
};

/**
 * Token metadata for EIP-712 domain
 */
export const TOKEN_METADATA: Record<number, { name: string; version: string }> = {
  98866: { name: 'USD₮0', version: '1' },
  1: { name: 'USD Coin', version: '2' },
  8453: { name: 'USD Coin', version: '2' },
  42161: { name: 'USD Coin', version: '2' },
  10: { name: 'USD Coin', version: '2' },
  137: { name: 'USD Coin', version: '2' },
};

/**
 * RPC URLs for different chains
 */
export const RPC_URLS: Record<number, string> = {
  98866: 'https://rpc.plasma.io',
  1: 'https://eth.llamarpc.com',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  137: 'https://polygon-rpc.com',
};

/**
 * Block explorer URLs
 */
export const EXPLORER_URLS: Record<number, string> = {
  98866: 'https://explorer.plasma.io',
  1: 'https://etherscan.io',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  10: 'https://optimistic.etherscan.io',
  137: 'https://polygonscan.com',
};

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
  const entry = Object.entries(SUPPORTED_CHAINS).find(([_, id]) => id === chainId);
  return entry ? entry[0] : `Unknown (${chainId})`;
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return Object.values(SUPPORTED_CHAINS).includes(chainId as SupportedChainId);
}

/**
 * Get USDT0/stablecoin address for a chain
 */
export function getStablecoinAddress(chainId: number): `0x${string}` | undefined {
  return USDT0_ADDRESSES[chainId];
}

/**
 * Get token metadata for EIP-712 domain
 */
export function getTokenMetadata(chainId: number): { name: string; version: string } {
  return TOKEN_METADATA[chainId] || { name: 'USD₮0', version: '1' };
}

/**
 * Get RPC URL for a chain
 */
export function getRpcUrl(chainId: number): string | undefined {
  return RPC_URLS[chainId];
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const baseUrl = EXPLORER_URLS[chainId] || 'https://explorer.plasma.io';
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 */
export function getExplorerAddressUrl(chainId: number, address: string): string {
  const baseUrl = EXPLORER_URLS[chainId] || 'https://explorer.plasma.io';
  return `${baseUrl}/address/${address}`;
}
