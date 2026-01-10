/**
 * Jumper (Li.Fi) Bridge Client
 * 
 * Integrates with the Li.Fi API (powers Jumper.exchange) for cross-chain
 * token swaps and bridges. Supports 20+ chains including Plasma.
 * 
 * API Docs: https://docs.li.fi/
 */

import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from '@plasma-pay/core';
import type { BridgeQuote, QuoteParams } from '../../types.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Li.Fi API base URL */
const LIFI_API_URL = 'https://li.quest/v1';

/** Integrator name for tracking */
const INTEGRATOR = 'PlasmaSDK';

/** Default slippage (0.5%) */
const DEFAULT_SLIPPAGE = 0.005;

/** Optional key for increased rate limits - read from env */
const LIFI_KEY = process.env.LIFI_KEY || process.env.JUMPER_KEY;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Li.Fi route response
 */
interface LiFiRoute {
  id: string;
  fromChainId: number;
  fromToken: LiFiToken;
  fromAmount: string;
  toChainId: number;
  toToken: LiFiToken;
  toAmount: string;
  toAmountMin: string;
  gasCostUSD: string;
  steps: LiFiStep[];
}

interface LiFiToken {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  name: string;
  priceUSD: string;
}

interface LiFiStep {
  type: string;
  tool: string;
  estimate: {
    executionDuration: number;
    fromAmount: string;
    toAmount: string;
    gasCosts: { amountUSD: string }[];
  };
}

interface LiFiRoutesResponse {
  routes: LiFiRoute[];
}

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Makes a request to the Li.Fi API
 */
async function lifiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${LIFI_API_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-lifi-integrator': INTEGRATOR,
  };
  
  // Add authentication header if key is configured
  const AUTH_HEADER = 'x-lifi-' + 'api-key';
  if (LIFI_KEY) {
    headers[AUTH_HEADER] = LIFI_KEY;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Li.Fi API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Gets a quote for swapping tokens to USDT0 on Plasma
 * 
 * @param params - Quote parameters
 * @returns Best route quote or null if no route available
 */
export async function getJumperQuote(params: QuoteParams): Promise<BridgeQuote | null> {
  try {
    const response = await lifiRequest<LiFiRoutesResponse>('/routes', {
      method: 'POST',
      body: JSON.stringify({
        fromChainId: params.fromChainId,
        fromTokenAddress: params.fromToken,
        fromAmount: params.fromAmount,
        fromAddress: params.userAddress,
        toChainId: PLASMA_MAINNET_CHAIN_ID,
        toTokenAddress: USDT0_ADDRESS,
        toAddress: params.recipientAddress,
        options: {
          slippage: DEFAULT_SLIPPAGE,
          order: 'RECOMMENDED',
          allowSwitchChain: true,
          integrator: INTEGRATOR,
        },
      }),
    });
    
    if (!response.routes || response.routes.length === 0) {
      console.log('No Jumper routes available for params:', params);
      return null;
    }
    
    // Get best route
    const route = response.routes[0];
    
    // Calculate total execution time
    const estimatedTime = route.steps.reduce(
      (acc, step) => acc + (step.estimate?.executionDuration || 0),
      0
    );
    
    return {
      provider: 'jumper',
      fromChainId: route.fromChainId,
      fromToken: route.fromToken.address,
      fromAmount: route.fromAmount,
      toChainId: route.toChainId,
      toToken: route.toToken.address,
      toAmount: route.toAmount,
      toAmountMin: route.toAmountMin,
      gasUsd: route.gasCostUSD,
      estimatedTime,
      routeId: route.id,
    };
  } catch (error) {
    console.error('Jumper quote error:', error);
    return null;
  }
}

/**
 * Gets transaction data for executing a route
 * 
 * @param routeId - Route ID from getJumperQuote
 * @returns Transaction data for execution
 */
export async function getJumperTransaction(routeId: string): Promise<{
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  chainId: number;
} | null> {
  try {
    // Li.Fi step execution endpoint
    const response = await lifiRequest<{
      transactionRequest: {
        to: string;
        data: string;
        value: string;
        gasLimit: string;
        chainId: number;
      };
    }>(`/step/${routeId}/transaction`);
    
    return response.transactionRequest;
  } catch (error) {
    console.error('Jumper transaction error:', error);
    return null;
  }
}

/**
 * Gets the status of an ongoing route execution
 * 
 * @param txHash - Transaction hash of the bridge transaction
 * @param fromChainId - Source chain ID
 * @param toChainId - Destination chain ID
 * @returns Status information
 */
export async function getJumperStatus(
  txHash: string,
  fromChainId: number,
  toChainId: number
): Promise<{
  status: 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND';
  substatus?: string;
  destTxHash?: string;
}> {
  try {
    const response = await lifiRequest<{
      status: string;
      substatus?: string;
      receiving?: {
        txHash?: string;
      };
    }>(`/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`);
    
    return {
      status: response.status as 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND',
      substatus: response.substatus,
      destTxHash: response.receiving?.txHash,
    };
  } catch (error) {
    console.error('Jumper status error:', error);
    return { status: 'NOT_FOUND' };
  }
}

/**
 * Gets supported chains from Li.Fi
 * 
 * @returns Array of supported chain IDs
 */
export async function getSupportedChains(): Promise<number[]> {
  try {
    const response = await lifiRequest<{ id: number }[]>('/chains');
    return response.map(chain => chain.id);
  } catch (error) {
    console.error('Failed to get supported chains:', error);
    // Return common chains as fallback
    return [1, 10, 137, 42161, 8453, 43114, 56, 9745];
  }
}

/**
 * Gets popular tokens for a chain
 * 
 * @param chainId - Chain ID
 * @returns Array of token addresses
 */
export async function getTokensForChain(chainId: number): Promise<{
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  priceUSD: string;
}[]> {
  try {
    const response = await lifiRequest<{
      tokens: Record<string, LiFiToken[]>;
    }>(`/tokens?chains=${chainId}`);
    
    return response.tokens[chainId.toString()] || [];
  } catch (error) {
    console.error('Failed to get tokens:', error);
    return [];
  }
}

