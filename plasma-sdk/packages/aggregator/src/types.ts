import type { Address, Hash } from 'viem';

export interface AggregatorConfig {
  integrator?: string;
  apiKey?: string;
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
