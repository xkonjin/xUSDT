/**
 * Bridge Aggregator
 * 
 * Aggregates quotes from multiple bridge providers (Jumper/Li.Fi and deBridge)
 * and selects the best route based on output amount and fees.
 */

import type { BridgeQuote, QuoteParams } from '../../types.js';
import { getJumperQuote, getJumperStatus } from './jumper.js';
import { getDebridgeQuote, getDebridgeStatus } from './debridge.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Timeout for quote requests (5 seconds)
 */
const QUOTE_TIMEOUT_MS = 5000;

/**
 * Minimum improvement to prefer one route over another (0.1%)
 * Helps avoid switching routes for tiny differences
 */
const MIN_IMPROVEMENT_THRESHOLD = 0.001;

// ============================================================================
// QUOTE AGGREGATION
// ============================================================================

/**
 * Gets quotes from all bridge providers and returns the best one
 * 
 * @param params - Quote parameters
 * @returns Best quote and all available quotes
 */
export async function getBestQuote(params: QuoteParams): Promise<{
  best: BridgeQuote | null;
  all: BridgeQuote[];
}> {
  // Fetch quotes from all providers in parallel with timeout
  const [jumperResult, debridgeResult] = await Promise.allSettled([
    withTimeout(getJumperQuote(params), QUOTE_TIMEOUT_MS),
    withTimeout(getDebridgeQuote(params), QUOTE_TIMEOUT_MS),
  ]);
  
  // Collect successful quotes
  const quotes: BridgeQuote[] = [];
  
  if (jumperResult.status === 'fulfilled' && jumperResult.value) {
    quotes.push(jumperResult.value);
  } else if (jumperResult.status === 'rejected') {
    console.log('Jumper quote failed:', jumperResult.reason);
  }
  
  if (debridgeResult.status === 'fulfilled' && debridgeResult.value) {
    quotes.push(debridgeResult.value);
  } else if (debridgeResult.status === 'rejected') {
    console.log('deBridge quote failed:', debridgeResult.reason);
  }
  
  if (quotes.length === 0) {
    return { best: null, all: [] };
  }
  
  // Sort by output amount (highest first)
  quotes.sort((a, b) => {
    const aAmount = BigInt(a.toAmount);
    const bAmount = BigInt(b.toAmount);
    return aAmount > bAmount ? -1 : aAmount < bAmount ? 1 : 0;
  });
  
  // Select best quote
  const best = quotes[0];
  
  console.log(`Best route: ${best.provider} - ${best.toAmount} USDT0 (gas: $${best.gasUsd})`);
  
  return { best, all: quotes };
}

/**
 * Gets a quick quote from the fastest provider
 * Useful for UI previews where speed matters more than accuracy
 * 
 * @param params - Quote parameters
 * @returns First available quote
 */
export async function getQuickQuote(params: QuoteParams): Promise<BridgeQuote | null> {
  const result = await Promise.race([
    getJumperQuote(params),
    getDebridgeQuote(params),
  ]);
  
  return result;
}

/**
 * Compares two quotes and determines which is better
 * 
 * @param a - First quote
 * @param b - Second quote
 * @returns Positive if a is better, negative if b is better, 0 if equal
 */
export function compareQuotes(a: BridgeQuote, b: BridgeQuote): number {
  const aAmount = BigInt(a.toAmount);
  const bAmount = BigInt(b.toAmount);
  
  // Calculate percentage difference
  const diff = Number(aAmount - bAmount) / Number(bAmount);
  
  // If difference is less than threshold, compare by gas cost
  if (Math.abs(diff) < MIN_IMPROVEMENT_THRESHOLD) {
    const aGas = parseFloat(a.gasUsd);
    const bGas = parseFloat(b.gasUsd);
    return bGas - aGas; // Lower gas is better
  }
  
  return aAmount > bAmount ? 1 : -1;
}

// ============================================================================
// STATUS TRACKING
// ============================================================================

/**
 * Gets the status of a bridge transaction
 * 
 * @param provider - Bridge provider ('jumper' or 'debridge')
 * @param params - Provider-specific params
 * @returns Transaction status
 */
export async function getBridgeStatus(
  provider: 'jumper' | 'debridge',
  params: {
    txHash?: string;
    orderId?: string;
    fromChainId?: number;
    toChainId?: number;
  }
): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'unknown';
  destTxHash?: string;
}> {
  if (provider === 'jumper' && params.txHash && params.fromChainId && params.toChainId) {
    const result = await getJumperStatus(params.txHash, params.fromChainId, params.toChainId);
    
    return {
      status: result.status === 'DONE' ? 'completed' :
              result.status === 'FAILED' ? 'failed' :
              result.status === 'PENDING' ? 'pending' : 'unknown',
      destTxHash: result.destTxHash,
    };
  }
  
  if (provider === 'debridge' && params.orderId) {
    const result = await getDebridgeStatus(params.orderId);
    
    return {
      status: result.status === 'Fulfilled' || result.status === 'ClaimedUnlock' ? 'completed' :
              result.status === 'Cancelled' ? 'failed' :
              result.status === 'Created' || result.status === 'SentUnlock' ? 'pending' : 'unknown',
      destTxHash: result.destTxHash,
    };
  }
  
  return { status: 'unknown' };
}

/**
 * Polls for bridge completion
 * 
 * @param provider - Bridge provider
 * @param params - Status params
 * @param options - Polling options
 * @returns Final status
 */
export async function waitForBridgeCompletion(
  provider: 'jumper' | 'debridge',
  params: {
    txHash?: string;
    orderId?: string;
    fromChainId?: number;
    toChainId?: number;
  },
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    onStatus?: (status: string) => void;
  } = {}
): Promise<{
  status: 'completed' | 'failed' | 'timeout';
  destTxHash?: string;
}> {
  const maxAttempts = options.maxAttempts || 60; // 5 minutes with 5s interval
  const intervalMs = options.intervalMs || 5000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getBridgeStatus(provider, params);
    
    options.onStatus?.(result.status);
    
    if (result.status === 'completed') {
      return { status: 'completed', destTxHash: result.destTxHash };
    }
    
    if (result.status === 'failed') {
      return { status: 'failed' };
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return { status: 'timeout' };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Wraps a promise with a timeout
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Formats a quote for display
 */
export function formatQuote(quote: BridgeQuote): string {
  const amount = parseFloat(quote.toAmount) / 1e6; // Assuming 6 decimals
  return `${quote.provider}: ${amount.toFixed(2)} USDT0 (gas: $${quote.gasUsd}, ~${Math.round(quote.estimatedTime / 60)}min)`;
}

/**
 * Gets supported chains from all providers
 */
export async function getAllSupportedChains(): Promise<number[]> {
  const [jumperChains, debridgeChains] = await Promise.allSettled([
    import('./jumper.js').then(m => m.getSupportedChains()),
    import('./debridge.js').then(m => m.getSupportedChains()),
  ]);
  
  const chains = new Set<number>();
  
  if (jumperChains.status === 'fulfilled') {
    jumperChains.value.forEach(id => chains.add(id));
  }
  if (debridgeChains.status === 'fulfilled') {
    debridgeChains.value.forEach(id => chains.add(id));
  }
  
  return Array.from(chains);
}

