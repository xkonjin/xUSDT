/**
 * deBridge DLN Client
 * 
 * Integrates with the deBridge DLN (Decentralized Liquidity Network) API
 * for cross-chain token transfers. Known for fast execution (~2 min) and Solana support.
 * 
 * API Docs: https://docs.dln.trade/
 */

import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS, ZERO_ADDRESS } from '@plasma-pay/core';
import type { BridgeQuote, QuoteParams, BridgeTransaction } from './types';

const DLN_API_URL = 'https://api.dln.trade/v1.0';
const AFFILIATE_FEE_PERCENT = 0;
const AFFILIATE_FEE_RECIPIENT = ZERO_ADDRESS;

// deBridge chain ID mapping
const DEBRIDGE_CHAIN_IDS: Record<number, number> = {
  1: 1,           // Ethereum
  10: 10,         // Optimism
  56: 56,         // BSC
  137: 137,       // Polygon
  42161: 42161,   // Arbitrum
  43114: 43114,   // Avalanche
  8453: 8453,     // Base
  9745: 9745,     // Plasma
  7565164: 7565164, // Solana
};

function toDebridgeChainId(chainId: number): number {
  return DEBRIDGE_CHAIN_IDS[chainId] || chainId;
}

interface DLNQuoteResponse {
  estimation: {
    srcChainTokenIn: {
      address: string;
      symbol: string;
      decimals: number;
      amount: string;
      approximateOperatingExpense: string;
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
}

interface DLNOrderStatusResponse {
  orderId: string;
  status: string;
  errorMessage?: string;
  fulfillmentTransaction?: {
    transactionHash: string;
  };
}

async function dlnRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(`${DLN_API_URL}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`deBridge API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

/**
 * Gets a quote for swapping tokens to USDT0 on Plasma via deBridge
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
    
    // Estimate gas cost
    const gasCostUsd = estimation.costsDetails
      ? estimation.costsDetails.reduce((acc) => acc + 0.5, 0)
      : 1;
    
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
      estimatedTime: 120, // ~2 minutes average
      routeId: response.orderId || `debridge_${Date.now()}`,
    };
  } catch (error) {
    console.error('deBridge quote error:', error);
    return null;
  }
}

/**
 * Gets transaction data for executing a deBridge order
 */
export async function getDebridgeTransaction(params: QuoteParams): Promise<BridgeTransaction | null> {
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
      chainId: params.fromChainId,
      routeId: response.orderId || `debridge_${Date.now()}`,
    };
  } catch (error) {
    console.error('deBridge transaction error:', error);
    return null;
  }
}

/**
 * Gets the status of a deBridge order
 */
export async function getDebridgeStatus(orderId: string): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'unknown';
  destTxHash?: string;
  error?: string;
}> {
  try {
    const response = await dlnRequest<DLNOrderStatusResponse>(`/dln/order/${orderId}/status`);
    
    let status: 'pending' | 'completed' | 'failed' | 'unknown';
    switch (response.status) {
      case 'Fulfilled':
      case 'ClaimedUnlock':
        status = 'completed';
        break;
      case 'Created':
      case 'SentUnlock':
        status = 'pending';
        break;
      case 'Cancelled':
        status = 'failed';
        break;
      default:
        status = 'unknown';
    }
    
    return {
      status,
      destTxHash: response.fulfillmentTransaction?.transactionHash,
      error: response.errorMessage,
    };
  } catch (error) {
    console.error('deBridge status error:', error);
    return { status: 'unknown' };
  }
}

/**
 * Gets supported chains from deBridge
 */
export async function getDebridgeSupportedChains(): Promise<number[]> {
  try {
    const response = await dlnRequest<{ chainId: number }[]>('/supported-chains-info');
    return response.map(chain => chain.chainId);
  } catch (error) {
    console.error('Failed to get deBridge supported chains:', error);
    return [1, 10, 56, 137, 42161, 43114, 8453, 7565164];
  }
}

/**
 * Checks if a chain is supported by deBridge
 */
export function isDebridgeSupported(chainId: number): boolean {
  return chainId in DEBRIDGE_CHAIN_IDS;
}
