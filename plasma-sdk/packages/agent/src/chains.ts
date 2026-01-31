/**
 * @plasma-pay/agent - Chain Definitions
 * 
 * Viem chain definitions for Plasma and supported networks
 */

import { defineChain } from 'viem';

/**
 * Plasma Chain Definition
 */
export const plasma = defineChain({
  id: 9745,
  name: 'Plasma',
  nativeCurrency: {
    decimals: 18,
    name: 'XPL',
    symbol: 'XPL',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.plasma.xyz'],
    },
    public: {
      http: ['https://rpc.plasma.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Plasma Explorer',
      url: 'https://explorer.plasma.xyz',
    },
  },
  contracts: {
    // USDT0 contract address on Plasma
    usdt0: {
      address: '0x0000000000000000000000000000000000000000', // TODO: Replace with actual
    },
  },
});

/**
 * Supported chain IDs
 */
export const SUPPORTED_CHAINS = {
  plasma: 9745,
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  optimism: 10,
  polygon: 137,
  avalanche: 43114,
  bsc: 56,
} as const;

/**
 * USDT0 addresses on different chains
 */
export const USDT0_ADDRESSES: Record<number, `0x${string}`> = {
  9745: '0x0000000000000000000000000000000000000000', // Plasma - TODO: Replace
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum USDT
  8453: '0x0000000000000000000000000000000000000000', // Base - TODO: Replace
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
  return Object.values(SUPPORTED_CHAINS).includes(chainId as any);
}
