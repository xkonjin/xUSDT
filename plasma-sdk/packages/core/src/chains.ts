/**
 * Chain Configurations for Plasma SDK
 */

import { defineChain } from 'viem';
import type { Chain } from 'viem';
import {
  PLASMA_MAINNET_CHAIN_ID,
  PLASMA_TESTNET_CHAIN_ID,
  PLASMA_MAINNET_RPC,
  PLASMA_TESTNET_RPC,
  PLASMA_EXPLORER_URL,
  USDT0_ADDRESS,
  XPL_SYMBOL,
  XPL_DECIMALS,
} from './constants';
import type { PlasmaChainConfig } from './types';

/**
 * Plasma Mainnet Chain Definition (viem compatible)
 */
export const plasmaMainnet: Chain = defineChain({
  id: PLASMA_MAINNET_CHAIN_ID,
  name: 'Plasma',
  nativeCurrency: {
    name: 'XPL',
    symbol: XPL_SYMBOL,
    decimals: XPL_DECIMALS,
  },
  rpcUrls: {
    default: {
      http: [PLASMA_MAINNET_RPC],
    },
    public: {
      http: [PLASMA_MAINNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: 'Plasma Explorer',
      url: PLASMA_EXPLORER_URL,
    },
  },
});

/**
 * Plasma Testnet Chain Definition (viem compatible)
 */
export const plasmaTestnet: Chain = defineChain({
  id: PLASMA_TESTNET_CHAIN_ID,
  name: 'Plasma Testnet',
  nativeCurrency: {
    name: 'XPL',
    symbol: XPL_SYMBOL,
    decimals: XPL_DECIMALS,
  },
  rpcUrls: {
    default: {
      http: [PLASMA_TESTNET_RPC],
    },
    public: {
      http: [PLASMA_TESTNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: 'Plasma Testnet Explorer',
      url: 'https://explorer-testnet.plasma.to',
    },
  },
  testnet: true,
});

/**
 * Plasma Chain Configurations
 */
export const plasmaChains: Record<'mainnet' | 'testnet', PlasmaChainConfig> = {
  mainnet: {
    chainId: PLASMA_MAINNET_CHAIN_ID,
    name: 'Plasma',
    rpcUrl: PLASMA_MAINNET_RPC,
    explorerUrl: PLASMA_EXPLORER_URL,
    usdt0Address: USDT0_ADDRESS,
  },
  testnet: {
    chainId: PLASMA_TESTNET_CHAIN_ID,
    name: 'Plasma Testnet',
    rpcUrl: PLASMA_TESTNET_RPC,
    explorerUrl: 'https://explorer-testnet.plasma.to',
    usdt0Address: USDT0_ADDRESS, // Same address on testnet
  },
};

/**
 * Get chain config by network name
 */
export function getPlasmaChain(network: 'mainnet' | 'testnet' = 'mainnet'): PlasmaChainConfig {
  return plasmaChains[network];
}

/**
 * Get viem Chain by network name
 */
export function getViemChain(network: 'mainnet' | 'testnet' = 'mainnet'): Chain {
  return network === 'mainnet' ? plasmaMainnet : plasmaTestnet;
}

/**
 * Check if chain ID is Plasma
 */
export function isPlasmaChain(chainId: number): boolean {
  return chainId === PLASMA_MAINNET_CHAIN_ID || chainId === PLASMA_TESTNET_CHAIN_ID;
}

/**
 * Get network name from chain ID
 */
export function getNetworkFromChainId(chainId: number): 'mainnet' | 'testnet' | null {
  if (chainId === PLASMA_MAINNET_CHAIN_ID) return 'mainnet';
  if (chainId === PLASMA_TESTNET_CHAIN_ID) return 'testnet';
  return null;
}

/**
 * Build explorer URL for transaction
 */
export function getExplorerTxUrl(txHash: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const config = plasmaChains[network];
  return `${config.explorerUrl}/tx/${txHash}`;
}

/**
 * Build explorer URL for address
 */
export function getExplorerAddressUrl(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): string {
  const config = plasmaChains[network];
  return `${config.explorerUrl}/address/${address}`;
}
