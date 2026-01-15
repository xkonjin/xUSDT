/**
 * Mock for @plasma-pay/aggregator
 * 
 * Used in tests to avoid ESM transformation issues with dependencies like @lifi/sdk
 */

export const POPULAR_SOURCE_CHAINS = [
  {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://etherscan.io',
  },
  {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://arbiscan.io',
  },
  {
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://optimistic.etherscan.io',
  },
];

export const POPULAR_TOKENS = {
  1: [
    { chainId: 1, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', name: 'Ether', decimals: 18 },
    { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  42161: [
    { chainId: 42161, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', name: 'Ether', decimals: 18 },
    { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  ],
  10: [
    { chainId: 10, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', symbol: 'ETH', name: 'Ether', decimals: 18 },
  ],
};

export type BridgeProvider = 'lifi' | 'debridge' | 'squid' | 'across';

export interface BridgeQuote {
  provider: BridgeProvider;
  fromChainId: number;
  fromToken: string;
  fromAmount: string;
  toChainId: number;
  toToken: string;
  toAmount: string;
  toAmountMin: string;
  gasUsd: string;
  estimatedTime: number;
  routeId: string;
  priceImpact?: string;
}

export interface ChainInfo {
  chainId: number;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  explorerUrl?: string;
}

export interface TokenInfo {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const getBestBridgeQuote = jest.fn();
export const getBridgeTransaction = jest.fn();
export const getBridgeStatus = jest.fn();
