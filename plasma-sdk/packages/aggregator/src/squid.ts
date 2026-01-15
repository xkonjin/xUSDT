/**
 * Squid Router Client
 * 
 * Integrates with the Squid Router API for cross-chain token swaps.
 * Supports 100+ chains via Axelar network including EVM, Cosmos, and more.
 * 
 * API Docs: https://docs.squidrouter.com/
 */

import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from '@plasma-pay/core';
import type { BridgeQuote, QuoteParams, BridgeTransaction } from './types';

const SQUID_API_URL = 'https://api.squidrouter.com/v1';
const INTEGRATOR_ID = process.env.SQUID_INTEGRATOR_ID || 'plasma-sdk';
const DEFAULT_SLIPPAGE = 1; // 1%

interface SquidToken {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  coingeckoId?: string;
}

interface SquidRouteEstimate {
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  exchangeRate: string;
  estimatedRouteDuration: number;
  aggregatePriceImpact: string;
  gasCosts: {
    amount: string;
    amountUSD: string;
    token: SquidToken;
  }[];
}

interface SquidRouteResponse {
  route: {
    estimate: SquidRouteEstimate;
    transactionRequest: {
      target: string;
      data: string;
      value: string;
      gasLimit: string;
      gasPrice?: string;
    };
    params: {
      fromChain: string;
      toChain: string;
      fromToken: string;
      toToken: string;
      fromAmount: string;
      toAddress: string;
      slippage: number;
    };
  };
  requestId: string;
}

interface SquidStatusResponse {
  id: string;
  status: 'ongoing' | 'success' | 'partial_success' | 'needs_gas' | 'not_found';
  fromChain: { transactionId: string; };
  toChain?: { transactionId: string; };
  squidTransactionStatus?: string;
  error?: { message: string; };
}

async function squidRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${SQUID_API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-integrator-id': INTEGRATOR_ID,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Squid API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * Gets a quote for swapping tokens to USDT0 on Plasma via Squid Router
 */
export async function getSquidQuote(params: QuoteParams): Promise<BridgeQuote | null> {
  try {
    const response = await squidRequest<SquidRouteResponse>('/route', {
      method: 'POST',
      body: JSON.stringify({
        fromChain: params.fromChainId.toString(),
        fromToken: params.fromToken,
        fromAmount: params.fromAmount,
        toChain: PLASMA_MAINNET_CHAIN_ID.toString(),
        toToken: USDT0_ADDRESS,
        toAddress: params.recipientAddress,
        slippage: DEFAULT_SLIPPAGE,
        enableExpress: true,
        quoteOnly: true,
      }),
    });
    
    if (!response.route) {
      console.log('No Squid route available for params:', params);
      return null;
    }
    
    const { estimate } = response.route;
    
    const totalGasUsd = estimate.gasCosts.reduce(
      (acc, cost) => acc + parseFloat(cost.amountUSD || '0'),
      0
    );
    
    return {
      provider: 'squid',
      fromChainId: params.fromChainId,
      fromToken: params.fromToken,
      fromAmount: params.fromAmount,
      toChainId: PLASMA_MAINNET_CHAIN_ID,
      toToken: USDT0_ADDRESS,
      toAmount: estimate.toAmount,
      toAmountMin: estimate.toAmountMin,
      gasUsd: totalGasUsd.toFixed(2),
      estimatedTime: estimate.estimatedRouteDuration,
      routeId: response.requestId,
      priceImpact: estimate.aggregatePriceImpact,
    };
  } catch (error) {
    console.error('Squid quote error:', error);
    return null;
  }
}

/**
 * Gets transaction data for executing a Squid route
 */
export async function getSquidTransaction(params: QuoteParams): Promise<BridgeTransaction | null> {
  try {
    const response = await squidRequest<SquidRouteResponse>('/route', {
      method: 'POST',
      body: JSON.stringify({
        fromChain: params.fromChainId.toString(),
        fromToken: params.fromToken,
        fromAmount: params.fromAmount,
        toChain: PLASMA_MAINNET_CHAIN_ID.toString(),
        toToken: USDT0_ADDRESS,
        toAddress: params.recipientAddress,
        fromAddress: params.userAddress,
        slippage: DEFAULT_SLIPPAGE,
        enableExpress: true,
        quoteOnly: false,
      }),
    });
    
    if (!response.route?.transactionRequest) {
      console.log('No Squid transaction available');
      return null;
    }
    
    const { transactionRequest } = response.route;
    
    return {
      to: transactionRequest.target,
      data: transactionRequest.data,
      value: transactionRequest.value,
      gasLimit: transactionRequest.gasLimit,
      chainId: params.fromChainId,
      routeId: response.requestId,
    };
  } catch (error) {
    console.error('Squid transaction error:', error);
    return null;
  }
}

/**
 * Gets the status of a Squid transaction
 */
export async function getSquidStatus(
  txHash: string,
  fromChainId: number
): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'unknown';
  destTxHash?: string;
  error?: string;
}> {
  try {
    const response = await squidRequest<SquidStatusResponse>(
      `/status?transactionId=${txHash}&fromChainId=${fromChainId}`
    );
    
    let status: 'pending' | 'completed' | 'failed' | 'unknown';
    switch (response.status) {
      case 'success':
      case 'partial_success':
        status = 'completed';
        break;
      case 'ongoing':
      case 'needs_gas':
        status = 'pending';
        break;
      case 'not_found':
        status = 'unknown';
        break;
      default:
        status = 'unknown';
    }
    
    return {
      status,
      destTxHash: response.toChain?.transactionId,
      error: response.error?.message,
    };
  } catch (error) {
    console.error('Squid status error:', error);
    return { status: 'unknown' };
  }
}

/**
 * Gets supported chains from Squid Router
 */
export async function getSquidSupportedChains(): Promise<number[]> {
  try {
    const response = await squidRequest<{ chains: { chainId: number }[] }>('/chains');
    return response.chains.map(chain => chain.chainId);
  } catch (error) {
    console.error('Failed to get Squid supported chains:', error);
    return [1, 10, 137, 42161, 8453, 43114, 56, 250];
  }
}

/**
 * Gets popular tokens for a chain from Squid
 */
export async function getSquidTokens(chainId: number): Promise<{
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}[]> {
  try {
    const response = await squidRequest<{ tokens: SquidToken[] }>(`/tokens?chainId=${chainId}`);
    return response.tokens.map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
    }));
  } catch (error) {
    console.error('Failed to get Squid tokens:', error);
    return [];
  }
}
