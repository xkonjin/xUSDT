/**
 * deBridge DLN Client
 * 
 * Integrates with the deBridge DLN (Decentralized Liquidity Network) API
 * for cross-chain token transfers. Known for fast execution and Solana support.
 * 
 * API Docs: https://docs.dln.trade/
 */

import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS, ZERO_ADDRESS } from '@plasma-pay/core';
import type { BridgeQuote, QuoteParams } from '../../types.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** deBridge DLN API base URL */
const DLN_API_URL = 'https://api.dln.trade/v1.0';

/** Affiliate code for tracking */
const AFFILIATE_FEE_PERCENT = 0; // 0% affiliate fee
const AFFILIATE_FEE_RECIPIENT = ZERO_ADDRESS;

/** Slippage in basis points (50 = 0.5%) */
const SLIPPAGE_BPS = 50;

// ============================================================================
// CHAIN ID MAPPING
// ============================================================================

/**
 * deBridge uses their own chain IDs for some networks
 * This maps from standard chain IDs to deBridge chain IDs
 */
const DEBRIDGE_CHAIN_IDS: Record<number, number> = {
  1: 1,           // Ethereum
  10: 10,         // Optimism
  56: 56,         // BSC
  137: 137,       // Polygon
  42161: 42161,   // Arbitrum
  43114: 43114,   // Avalanche
  8453: 8453,     // Base
  9745: 9745,     // Plasma (if supported)
  7565164: 7565164, // Solana (deBridge ID)
};

/**
 * Convert standard chain ID to deBridge chain ID
 */
function toDebridgeChainId(chainId: number): number {
  return DEBRIDGE_CHAIN_IDS[chainId] || chainId;
}

// ============================================================================
// TYPES
// ============================================================================

interface DLNQuoteResponse {
  estimation: {
    srcChainTokenIn: {
      address: string;
      symbol: string;
      decimals: number;
      amount: string;
      approximateOperatingExpense: string;
    };
    srcChainTokenOut: {
      address: string;
      amount: string;
    };
    dstChainTokenOut: {
      address: string;
      symbol: string;
      decimals: number;
      amount: string;
      recommendedAmount: string;
      maxTheoreticalAmount: string;
    };
    recommendedSlippage: number;
    costsDetails: Array<{
      chain: string;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      amountOut: string;
      type: string;
    }>;
  };
  tx?: {
    to: string;
    data: string;
    value: string;
  };
  orderId?: string;
  prependedOperatingExpenseCost?: string;
}

interface DLNOrderStatusResponse {
  orderId: string;
  status: string;
  errorMessage?: string;
  fulfillmentTransaction?: {
    transactionHash: string;
  };
}

// ============================================================================
// API CLIENT
// ============================================================================

/**
 * Makes a request to the deBridge DLN API
 */
async function dlnRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(`${DLN_API_URL}${endpoint}`);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`deBridge API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Gets a quote for swapping tokens to USDT0 on Plasma via deBridge
 * 
 * @param params - Quote parameters
 * @returns Best quote or null if no route available
 */
export async function getDebridgeQuote(params: QuoteParams): Promise<BridgeQuote | null> {
  try {
    const response = await dlnRequest<DLNQuoteResponse>('/dln/order/quote', {
      srcChainId: toDebridgeChainId(params.fromChainId),
      srcChainTokenIn: params.fromToken,
      srcChainTokenInAmount: params.fromAmount,
      dstChainId: toDebridgeChainId(PLASMA_MAINNET_CHAIN_ID),
      dstChainTokenOut: USDT0_ADDRESS,
      dstChainTokenOutRecipient: params.recipientAddress,
      senderAddress: params.userAddress,
      srcChainOrderAuthorityAddress: params.userAddress,
      dstChainOrderAuthorityAddress: params.recipientAddress,
      affiliateFeePercent: AFFILIATE_FEE_PERCENT,
      affiliateFeeRecipient: AFFILIATE_FEE_RECIPIENT,
    });
    
    if (!response.estimation) {
      console.log('No deBridge route available for params:', params);
      return null;
    }
    
    const estimation = response.estimation;
    
    // Calculate gas cost in USD (approximate)
    const gasCostUsd = estimation.costsDetails
      ? estimation.costsDetails.reduce((acc, cost) => {
          // Rough estimation based on cost type
          return acc + 0.5; // Placeholder
        }, 0)
      : 1; // Default estimate
    
    // deBridge typically completes in 1-3 minutes
    const estimatedTime = 120; // 2 minutes average
    
    return {
      provider: 'debridge',
      fromChainId: params.fromChainId,
      fromToken: params.fromToken,
      fromAmount: params.fromAmount,
      toChainId: PLASMA_MAINNET_CHAIN_ID,
      toToken: USDT0_ADDRESS,
      toAmount: estimation.dstChainTokenOut.recommendedAmount,
      toAmountMin: estimation.dstChainTokenOut.amount,
      gasUsd: gasCostUsd.toFixed(2),
      estimatedTime,
      routeId: response.orderId || '',
    };
  } catch (error) {
    console.error('deBridge quote error:', error);
    return null;
  }
}

/**
 * Creates a transaction for executing a deBridge order
 * 
 * @param params - Same params used for the quote
 * @returns Transaction data for execution
 */
export async function getDebridgeTransaction(params: QuoteParams): Promise<{
  to: string;
  data: string;
  value: string;
  orderId: string;
} | null> {
  try {
    const response = await dlnRequest<DLNQuoteResponse>('/dln/order/create-tx', {
      srcChainId: toDebridgeChainId(params.fromChainId),
      srcChainTokenIn: params.fromToken,
      srcChainTokenInAmount: params.fromAmount,
      dstChainId: toDebridgeChainId(PLASMA_MAINNET_CHAIN_ID),
      dstChainTokenOut: USDT0_ADDRESS,
      dstChainTokenOutAmount: 'auto',
      dstChainTokenOutRecipient: params.recipientAddress,
      senderAddress: params.userAddress,
      srcChainOrderAuthorityAddress: params.userAddress,
      dstChainOrderAuthorityAddress: params.recipientAddress,
      affiliateFeePercent: AFFILIATE_FEE_PERCENT,
      affiliateFeeRecipient: AFFILIATE_FEE_RECIPIENT,
      referralCode: 'PLASMA',
    });
    
    if (!response.tx) {
      console.log('No deBridge transaction available');
      return null;
    }
    
    return {
      to: response.tx.to,
      data: response.tx.data,
      value: response.tx.value,
      orderId: response.orderId || '',
    };
  } catch (error) {
    console.error('deBridge transaction error:', error);
    return null;
  }
}

/**
 * Gets the status of a deBridge order
 * 
 * @param orderId - Order ID from createTransaction
 * @returns Order status
 */
export async function getDebridgeStatus(orderId: string): Promise<{
  status: 'Created' | 'Fulfilled' | 'SentUnlock' | 'ClaimedUnlock' | 'Cancelled' | 'Unknown';
  destTxHash?: string;
  error?: string;
}> {
  try {
    const response = await dlnRequest<DLNOrderStatusResponse>(`/dln/order/${orderId}/status`);
    
    return {
      status: response.status as any,
      destTxHash: response.fulfillmentTransaction?.transactionHash,
      error: response.errorMessage,
    };
  } catch (error) {
    console.error('deBridge status error:', error);
    return { status: 'Unknown' };
  }
}

/**
 * Gets supported chains from deBridge
 * 
 * @returns Array of supported chain IDs
 */
export async function getSupportedChains(): Promise<number[]> {
  try {
    const response = await dlnRequest<{ chainId: number }[]>('/supported-chains-info');
    return response.map(chain => chain.chainId);
  } catch (error) {
    console.error('Failed to get deBridge supported chains:', error);
    // Return common chains as fallback
    return [1, 10, 56, 137, 42161, 43114, 8453, 7565164];
  }
}

/**
 * Checks if a chain is supported by deBridge
 * 
 * @param chainId - Chain ID to check
 * @returns Whether the chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in DEBRIDGE_CHAIN_IDS;
}

