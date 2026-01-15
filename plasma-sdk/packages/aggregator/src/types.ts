import type { Address, Hash } from 'viem';

export interface AggregatorConfig {
  integrator?: string;
  apiKey?: string;
  /** Preferred provider order (first = highest priority) */
  preferredProviders?: BridgeProvider[];
  /** Timeout for quote requests in ms */
  quoteTimeout?: number;
}

export interface SwapRequest {
  fromChainId: number;
  fromTokenAddress: Address;
  fromAmount: string;
  userAddress: Address;
  recipientAddress: Address;
  slippage?: number;
}

export interface SwapQuote {
  fromChainId: number;
  fromTokenAddress: Address;
  fromAmount: string;
  toChainId: number;
  toTokenAddress: Address;
  toAmount: string;
  toAmountMin: string;
  estimatedGasUsd: string;
  estimatedTimeSeconds: number;
  priceImpact: string;
  routeId: string;
}

export interface SwapResult {
  success: boolean;
  txHash?: Hash;
  amountReceived?: string;
  error?: string;
}

export interface TokenInfo {
  chainId: number;
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface SupportedChain {
  chainId: number;
  name: string;
  logoURI?: string;
}

export type RouteUpdateCallback = (routeId: string, status: string) => void;

// Bridge Provider Types
export type BridgeProvider = 'lifi' | 'debridge' | 'squid' | 'across';

export interface QuoteParams {
  fromChainId: number;
  fromToken: string;
  fromAmount: string;
  userAddress: string;
  recipientAddress: string;
  slippage?: number;
}

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

export interface BridgeTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit?: string;
  chainId: number;
  routeId: string;
  approval?: {
    token: string;
    spender: string;
    amount: string;
  };
}

export interface BridgeStatus {
  status: 'pending' | 'completed' | 'failed' | 'unknown';
  destTxHash?: string;
  error?: string;
}

export interface MultiAggregatorQuoteResult {
  best: BridgeQuote | null;
  all: BridgeQuote[];
  errors: { provider: BridgeProvider; error: string }[];
}

// Chain metadata for UI
export interface ChainInfo {
  chainId: number;
  name: string;
  shortName: string;
  logoURI?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl?: string;
  explorerUrl?: string;
}

// Popular source chains for bridging to Plasma
export const POPULAR_SOURCE_CHAINS: ChainInfo[] = [
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
  {
    chainId: 8453,
    name: 'Base',
    shortName: 'BASE',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://basescan.org',
  },
  {
    chainId: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    explorerUrl: 'https://polygonscan.com',
  },
  {
    chainId: 56,
    name: 'BNB Chain',
    shortName: 'BNB',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    explorerUrl: 'https://bscscan.com',
  },
  {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'AVAX',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    explorerUrl: 'https://snowtrace.io',
  },
];

// Popular tokens to bridge (addresses by chain)
export const POPULAR_TOKENS: Record<number, TokenInfo[]> = {
  // Ethereum
  1: [
    { chainId: 1, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'ETH', name: 'Ether', decimals: 18 },
    { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as Address, symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { chainId: 1, address: '0x6B175474E89094C44Da98b954EesDeCAD3F9d23A' as Address, symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
  ],
  // Arbitrum
  42161: [
    { chainId: 42161, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'ETH', name: 'Ether', decimals: 18 },
    { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' as Address, symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  // Optimism
  10: [
    { chainId: 10, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'ETH', name: 'Ether', decimals: 18 },
    { chainId: 10, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' as Address, symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { chainId: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  // Base
  8453: [
    { chainId: 8453, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'ETH', name: 'Ether', decimals: 18 },
    { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  // Polygon
  137: [
    { chainId: 137, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'MATIC', name: 'MATIC', decimals: 18 },
    { chainId: 137, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as Address, symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { chainId: 137, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
  // BNB Chain
  56: [
    { chainId: 56, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'BNB', name: 'BNB', decimals: 18 },
    { chainId: 56, address: '0x55d398326f99059fF775485246999027B3197955' as Address, symbol: 'USDT', name: 'Tether USD', decimals: 18 },
    { chainId: 56, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 18 },
  ],
  // Avalanche
  43114: [
    { chainId: 43114, address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, symbol: 'AVAX', name: 'AVAX', decimals: 18 },
    { chainId: 43114, address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7' as Address, symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { chainId: 43114, address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E' as Address, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
};
