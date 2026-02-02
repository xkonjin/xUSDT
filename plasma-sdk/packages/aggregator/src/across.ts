/**
 * Across Protocol Client
 * 
 * Integrates with the Across Protocol Swap API for ultra-fast cross-chain
 * token transfers. Uses intent-based architecture for ~30 second transfers.
 * 
 * API Docs: https://docs.across.to/
 */

import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from '@plasma-pay/core';
import type { BridgeQuote, QuoteParams, BridgeTransaction } from './types';

const ACROSS_API_URL = 'https://app.across.to/api';
const INTEGRATOR_ID = process.env.ACROSS_INTEGRATOR_ID || 'plasma-sdk';
const DEFAULT_SLIPPAGE = 100; // 1% in basis points

interface AcrossQuoteResponse {
  totalRelayFee: {
    total: string;
    pct: string;
  };
  relayerCapitalFee: {
    total: string;
    pct: string;
  };
  relayerGasFee: {
    total: string;
    pct: string;
  };
  lpFee: {
    total: string;
    pct: string;
  };
  timestamp: string;
  isAmountTooLow: boolean;
  quoteBlock: string;
  spokePoolAddress: string;
  exclusiveRelayer: string;
  exclusivityDeadline: string;
  expectedFillTimeSec: string;
}

interface AcrossSwapResponse {
  deposit: {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    destinationChainId: number;
    originChainId: number;
    depositor: string;
    recipient: string;
    quoteTimestamp: number;
    fillDeadline: number;
    exclusivityDeadline: number;
    message: string;
  };
  approval?: {
    token: string;
    spender: string;
    amount: string;
  };
  swapTx: {
    to: string;
    data: string;
    value: string;
  };
  depositTx: {
    to: string;
    data: string;
    value: string;
  };
}

interface AcrossStatusResponse {
  status: 'pending' | 'filled' | 'expired';
  fillTxHash?: string;
  destinationChainId?: number;
  depositTxHash?: string;
  updatedAt?: string;
}

async function acrossRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const url = new URL(`${ACROSS_API_URL}${endpoint}`);
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
    throw new Error(`Across API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

async function acrossPostRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${ACROSS_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Across API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

// Across supported chain IDs
const ACROSS_SUPPORTED_CHAINS = [
  1,      // Ethereum
  10,     // Optimism
  137,    // Polygon
  324,    // zkSync Era
  8453,   // Base
  42161,  // Arbitrum
  59144,  // Linea
  34443,  // Mode
  7777777, // Zora
  81457,  // Blast
  534352, // Scroll
];

/**
 * Checks if Across supports a route from source chain to Plasma
 */
export function isAcrossSupported(fromChainId: number): boolean {
  // Across requires both chains to be in their supported list
  // Plasma (98866) may not be supported yet - check dynamically
  return ACROSS_SUPPORTED_CHAINS.includes(fromChainId);
}

/**
 * Gets a quote for swapping tokens to USDT0 on Plasma via Across
 */
export async function getAcrossQuote(params: QuoteParams): Promise<BridgeQuote | null> {
  try {
    // Check if route is supported
    if (!isAcrossSupported(params.fromChainId)) {
      console.log('Across does not support chain:', params.fromChainId);
      return null;
    }
    
    // Across uses /swap/quote for combined swap+bridge
    const response = await acrossRequest<AcrossQuoteResponse>('/suggested-fees', {
      inputToken: params.fromToken,
      outputToken: USDT0_ADDRESS,
      originChainId: params.fromChainId,
      destinationChainId: PLASMA_MAINNET_CHAIN_ID,
      amount: params.fromAmount,
      recipient: params.recipientAddress,
    });
    
    if (response.isAmountTooLow) {
      console.log('Across: Amount too low for bridging');
      return null;
    }
    
    // Calculate output amount after fees
    const inputAmount = BigInt(params.fromAmount);
    const totalFee = BigInt(response.totalRelayFee.total);
    const outputAmount = inputAmount - totalFee;
    
    // Estimate gas cost in USD (approximate based on fee percentage)
    const feePercent = parseFloat(response.totalRelayFee.pct) / 1e18;
    const gasUsd = (parseFloat(params.fromAmount) * feePercent / 1e6).toFixed(2);
    
    return {
      provider: 'across',
      fromChainId: params.fromChainId,
      fromToken: params.fromToken,
      fromAmount: params.fromAmount,
      toChainId: PLASMA_MAINNET_CHAIN_ID,
      toToken: USDT0_ADDRESS,
      toAmount: outputAmount.toString(),
      toAmountMin: (outputAmount - (outputAmount * BigInt(DEFAULT_SLIPPAGE) / 10000n)).toString(),
      gasUsd,
      estimatedTime: parseInt(response.expectedFillTimeSec) || 30,
      routeId: `across_${response.quoteBlock}_${Date.now()}`,
      priceImpact: response.totalRelayFee.pct,
    };
  } catch (error) {
    console.error('Across quote error:', error);
    return null;
  }
}

/**
 * Gets transaction data for executing an Across swap+bridge
 */
export async function getAcrossTransaction(params: QuoteParams): Promise<BridgeTransaction | null> {
  try {
    if (!isAcrossSupported(params.fromChainId)) {
      return null;
    }
    
    const response = await acrossPostRequest<AcrossSwapResponse>('/swap', {
      inputToken: params.fromToken,
      outputToken: USDT0_ADDRESS,
      originChainId: params.fromChainId,
      destinationChainId: PLASMA_MAINNET_CHAIN_ID,
      amount: params.fromAmount,
      depositor: params.userAddress,
      recipient: params.recipientAddress,
      slippageTolerance: DEFAULT_SLIPPAGE,
      integratorId: INTEGRATOR_ID,
    });
    
    if (!response.depositTx) {
      console.log('No Across transaction available');
      return null;
    }
    
    // Return the deposit transaction (may need approval first)
    return {
      to: response.depositTx.to,
      data: response.depositTx.data,
      value: response.depositTx.value,
      chainId: params.fromChainId,
      routeId: `across_${Date.now()}`,
      approval: response.approval ? {
        token: response.approval.token,
        spender: response.approval.spender,
        amount: response.approval.amount,
      } : undefined,
    };
  } catch (error) {
    console.error('Across transaction error:', error);
    return null;
  }
}

/**
 * Gets the status of an Across deposit
 */
export async function getAcrossStatus(
  txHash: string,
  originChainId: number
): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'unknown';
  destTxHash?: string;
  error?: string;
}> {
  try {
    const response = await acrossRequest<AcrossStatusResponse>('/deposit/status', {
      depositTxHash: txHash,
      originChainId,
    });
    
    let status: 'pending' | 'completed' | 'failed' | 'unknown';
    switch (response.status) {
      case 'filled':
        status = 'completed';
        break;
      case 'pending':
        status = 'pending';
        break;
      case 'expired':
        status = 'failed';
        break;
      default:
        status = 'unknown';
    }
    
    return {
      status,
      destTxHash: response.fillTxHash,
    };
  } catch (error) {
    console.error('Across status error:', error);
    return { status: 'unknown' };
  }
}

/**
 * Gets supported chains from Across
 */
export async function getAcrossSupportedChains(): Promise<number[]> {
  // For now, return static list - Across doesn't have a public chains endpoint
  return ACROSS_SUPPORTED_CHAINS;
}

/**
 * Gets available routes from Across
 */
export async function getAcrossAvailableRoutes(): Promise<{
  fromChainId: number;
  toChainId: number;
  inputTokens: string[];
  outputTokens: string[];
}[]> {
  try {
    const response = await acrossRequest<{
      routes: {
        originChainId: number;
        destinationChainId: number;
        originToken: string;
        destinationToken: string;
      }[];
    }>('/available-routes');
    
    // Group by chain pair
    const routeMap = new Map<string, { fromChainId: number; toChainId: number; inputTokens: Set<string>; outputTokens: Set<string> }>();
    
    for (const route of response.routes) {
      const key = `${route.originChainId}-${route.destinationChainId}`;
      if (!routeMap.has(key)) {
        routeMap.set(key, {
          fromChainId: route.originChainId,
          toChainId: route.destinationChainId,
          inputTokens: new Set(),
          outputTokens: new Set(),
        });
      }
      const entry = routeMap.get(key)!;
      entry.inputTokens.add(route.originToken);
      entry.outputTokens.add(route.destinationToken);
    }
    
    return Array.from(routeMap.values()).map(entry => ({
      fromChainId: entry.fromChainId,
      toChainId: entry.toChainId,
      inputTokens: Array.from(entry.inputTokens),
      outputTokens: Array.from(entry.outputTokens),
    }));
  } catch (error) {
    console.error('Failed to get Across routes:', error);
    return [];
  }
}
