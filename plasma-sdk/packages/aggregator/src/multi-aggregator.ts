/**
 * Multi-Provider Bridge Aggregator
 * 
 * Aggregates quotes from multiple bridge providers (LI.FI, deBridge, Squid, Across)
 * and selects the best route based on output amount, gas costs, and estimated time.
 */

import type {
  BridgeQuote,
  QuoteParams,
  BridgeTransaction,
  BridgeStatus,
  BridgeProvider,
  MultiAggregatorQuoteResult,
  AggregatorConfig,
} from './types';

// Provider implementations
import { getSquidQuote, getSquidTransaction, getSquidStatus } from './squid';
import { getAcrossQuote, getAcrossTransaction, getAcrossStatus } from './across';
import { getDebridgeQuote, getDebridgeTransaction, getDebridgeStatus } from './debridge';
import { PlasmaAggregator } from './lifi';

const DEFAULT_QUOTE_TIMEOUT_MS = 5000;
const MIN_IMPROVEMENT_THRESHOLD = 0.001; // 0.1% minimum improvement to switch

export interface MultiAggregatorConfig extends AggregatorConfig {
  enabledProviders?: BridgeProvider[];
}

/**
 * Multi-Provider Bridge Aggregator
 * 
 * Fetches quotes from all enabled providers in parallel and returns the best route.
 */
export class MultiAggregator {
  private config: MultiAggregatorConfig;
  private lifiAggregator: PlasmaAggregator;
  private enabledProviders: BridgeProvider[];
  
  constructor(config: MultiAggregatorConfig = {}) {
    this.config = config;
    this.lifiAggregator = new PlasmaAggregator({
      integrator: config.integrator,
      apiKey: config.apiKey,
    });
    this.enabledProviders = config.enabledProviders || ['lifi', 'debridge', 'squid', 'across'];
  }
  
  /**
   * Gets quotes from all enabled providers and returns the best one
   */
  async getQuotes(params: QuoteParams): Promise<MultiAggregatorQuoteResult> {
    const timeout = this.config.quoteTimeout || DEFAULT_QUOTE_TIMEOUT_MS;
    const quotePromises: Promise<{ provider: BridgeProvider; quote: BridgeQuote | null; error?: string }>[] = [];
    
    // LI.FI
    if (this.enabledProviders.includes('lifi')) {
      quotePromises.push(
        this.withTimeout(
          this.getLifiQuote(params),
          timeout
        ).then(quote => ({ provider: 'lifi' as BridgeProvider, quote }))
         .catch(error => ({ provider: 'lifi' as BridgeProvider, quote: null, error: error.message }))
      );
    }
    
    // deBridge
    if (this.enabledProviders.includes('debridge')) {
      quotePromises.push(
        this.withTimeout(
          getDebridgeQuote(params),
          timeout
        ).then(quote => ({ provider: 'debridge' as BridgeProvider, quote }))
         .catch(error => ({ provider: 'debridge' as BridgeProvider, quote: null, error: error.message }))
      );
    }
    
    // Squid
    if (this.enabledProviders.includes('squid')) {
      quotePromises.push(
        this.withTimeout(
          getSquidQuote(params),
          timeout
        ).then(quote => ({ provider: 'squid' as BridgeProvider, quote }))
         .catch(error => ({ provider: 'squid' as BridgeProvider, quote: null, error: error.message }))
      );
    }
    
    // Across
    if (this.enabledProviders.includes('across')) {
      quotePromises.push(
        this.withTimeout(
          getAcrossQuote(params),
          timeout
        ).then(quote => ({ provider: 'across' as BridgeProvider, quote }))
         .catch(error => ({ provider: 'across' as BridgeProvider, quote: null, error: error.message }))
      );
    }
    
    const results = await Promise.allSettled(quotePromises);
    
    const quotes: BridgeQuote[] = [];
    const errors: { provider: BridgeProvider; error: string }[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.quote) {
          quotes.push(result.value.quote);
        } else if (result.value.error) {
          errors.push({ provider: result.value.provider, error: result.value.error });
        }
      } else {
        // Promise rejected (shouldn't happen with our catch blocks)
        console.error('Quote promise rejected:', result.reason);
      }
    }
    
    // Sort by output amount (highest first)
    quotes.sort((a, b) => {
      const aAmount = BigInt(a.toAmount);
      const bAmount = BigInt(b.toAmount);
      return aAmount > bAmount ? -1 : aAmount < bAmount ? 1 : 0;
    });
    
    const best = quotes[0] || null;
    
    if (best) {
      console.log(`Best route: ${best.provider} - ${best.toAmount} (gas: $${best.gasUsd}, ~${Math.round(best.estimatedTime / 60)}min)`);
    }
    
    return { best, all: quotes, errors };
  }
  
  /**
   * Gets the fastest available quote (first to respond)
   */
  async getQuickQuote(params: QuoteParams): Promise<BridgeQuote | null> {
    const promises: Promise<BridgeQuote | null>[] = [];
    
    if (this.enabledProviders.includes('across')) {
      promises.push(getAcrossQuote(params)); // Across is usually fastest
    }
    if (this.enabledProviders.includes('debridge')) {
      promises.push(getDebridgeQuote(params));
    }
    if (this.enabledProviders.includes('squid')) {
      promises.push(getSquidQuote(params));
    }
    if (this.enabledProviders.includes('lifi')) {
      promises.push(this.getLifiQuote(params));
    }
    
    if (promises.length === 0) {
      return null;
    }
    
    // Return first successful quote
    const result = await Promise.any(
      promises.map(p => p.then(q => {
        if (!q) throw new Error('No quote');
        return q;
      }))
    ).catch(() => null);
    
    return result;
  }
  
  /**
   * Gets transaction data for a specific provider
   */
  async getTransaction(
    provider: BridgeProvider,
    params: QuoteParams
  ): Promise<BridgeTransaction | null> {
    switch (provider) {
      case 'squid':
        return getSquidTransaction(params);
      case 'across':
        return getAcrossTransaction(params);
      case 'debridge':
        return getDebridgeTransaction(params);
      case 'lifi':
        return this.getLifiTransaction(params);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
  
  /**
   * Gets the status of a bridge transaction
   */
  async getStatus(
    provider: BridgeProvider,
    params: {
      txHash?: string;
      orderId?: string;
      fromChainId?: number;
      toChainId?: number;
    }
  ): Promise<BridgeStatus> {
    switch (provider) {
      case 'squid':
        if (params.txHash && params.fromChainId) {
          return getSquidStatus(params.txHash, params.fromChainId);
        }
        return { status: 'unknown' };
        
      case 'across':
        if (params.txHash && params.fromChainId) {
          return getAcrossStatus(params.txHash, params.fromChainId);
        }
        return { status: 'unknown' };
        
      case 'debridge':
        if (params.orderId) {
          return getDebridgeStatus(params.orderId);
        }
        return { status: 'unknown' };
        
      case 'lifi':
        if (params.txHash && params.fromChainId && params.toChainId) {
          return this.getLifiStatus(params.txHash, params.fromChainId, params.toChainId);
        }
        return { status: 'unknown' };
        
      default:
        return { status: 'unknown' };
    }
  }
  
  /**
   * Polls for bridge completion
   */
  async waitForCompletion(
    provider: BridgeProvider,
    params: {
      txHash?: string;
      orderId?: string;
      fromChainId?: number;
      toChainId?: number;
    },
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onStatus?: (status: BridgeStatus) => void;
    } = {}
  ): Promise<BridgeStatus> {
    const maxAttempts = options.maxAttempts || 60;
    const intervalMs = options.intervalMs || 5000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getStatus(provider, params);
      
      options.onStatus?.(status);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
      
      await this.sleep(intervalMs);
    }
    
    return { status: 'unknown', error: 'Timeout waiting for bridge completion' };
  }
  
  /**
   * Compares two quotes and determines which is better
   */
  compareQuotes(a: BridgeQuote, b: BridgeQuote): number {
    const aAmount = BigInt(a.toAmount);
    const bAmount = BigInt(b.toAmount);
    
    const diff = Number(aAmount - bAmount) / Number(bAmount);
    
    // If difference is less than threshold, compare by gas cost
    if (Math.abs(diff) < MIN_IMPROVEMENT_THRESHOLD) {
      const aGas = parseFloat(a.gasUsd);
      const bGas = parseFloat(b.gasUsd);
      return bGas - aGas; // Lower gas is better
    }
    
    return aAmount > bAmount ? 1 : -1;
  }
  
  // LI.FI specific methods
  private async getLifiQuote(params: QuoteParams): Promise<BridgeQuote | null> {
    const quote = await this.lifiAggregator.getQuote({
      fromChainId: params.fromChainId,
      fromTokenAddress: params.fromToken as `0x${string}`,
      fromAmount: params.fromAmount,
      userAddress: params.userAddress as `0x${string}`,
      recipientAddress: params.recipientAddress as `0x${string}`,
      slippage: params.slippage,
    });
    
    if (!quote) return null;
    
    return {
      provider: 'lifi',
      fromChainId: quote.fromChainId,
      fromToken: quote.fromTokenAddress,
      fromAmount: quote.fromAmount,
      toChainId: quote.toChainId,
      toToken: quote.toTokenAddress,
      toAmount: quote.toAmount,
      toAmountMin: quote.toAmountMin,
      gasUsd: quote.estimatedGasUsd,
      estimatedTime: quote.estimatedTimeSeconds,
      routeId: quote.routeId,
      priceImpact: quote.priceImpact,
    };
  }
  
  private async getLifiTransaction(_params: QuoteParams): Promise<BridgeTransaction | null> {
    // LI.FI executeRoute handles this internally
    // For now, return null - would need to refactor LI.FI client
    console.log('LI.FI transaction generation requires direct SDK execution');
    return null;
  }
  
  private async getLifiStatus(
    txHash: string,
    fromChainId: number,
    toChainId: number
  ): Promise<BridgeStatus> {
    try {
      const response = await fetch(
        `https://li.quest/v1/status?txHash=${txHash}&fromChain=${fromChainId}&toChain=${toChainId}`
      );
      
      if (!response.ok) {
        return { status: 'unknown' };
      }
      
      const data = await response.json() as {
        status: string;
        receiving?: { txHash?: string };
      };
      
      return {
        status: data.status === 'DONE' ? 'completed' :
                data.status === 'FAILED' ? 'failed' :
                data.status === 'PENDING' ? 'pending' : 'unknown',
        destTxHash: data.receiving?.txHash,
      };
    } catch (error) {
      console.error('LI.FI status error:', error);
      return { status: 'unknown' };
    }
  }
  
  // Utility methods
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let defaultMultiAggregator: MultiAggregator | null = null;

export function getMultiAggregator(config?: MultiAggregatorConfig): MultiAggregator {
  if (!defaultMultiAggregator) {
    defaultMultiAggregator = new MultiAggregator(config);
  }
  return defaultMultiAggregator;
}

// Convenience functions
export async function getBestBridgeQuote(params: QuoteParams): Promise<MultiAggregatorQuoteResult> {
  return getMultiAggregator().getQuotes(params);
}

export async function getQuickBridgeQuote(params: QuoteParams): Promise<BridgeQuote | null> {
  return getMultiAggregator().getQuickQuote(params);
}

export async function getBridgeTransaction(
  provider: BridgeProvider,
  params: QuoteParams
): Promise<BridgeTransaction | null> {
  return getMultiAggregator().getTransaction(provider, params);
}

export async function getBridgeStatus(
  provider: BridgeProvider,
  params: {
    txHash?: string;
    orderId?: string;
    fromChainId?: number;
    toChainId?: number;
  }
): Promise<BridgeStatus> {
  return getMultiAggregator().getStatus(provider, params);
}

/**
 * Formats a quote for display
 */
export function formatQuote(quote: BridgeQuote): string {
  const decimals = 6; // Assuming USDT0 with 6 decimals
  const amount = parseFloat(quote.toAmount) / Math.pow(10, decimals);
  const minutes = Math.round(quote.estimatedTime / 60);
  return `${quote.provider.toUpperCase()}: ${amount.toFixed(2)} USDT0 (gas: $${quote.gasUsd}, ~${minutes}min)`;
}

/**
 * Gets provider display name
 */
export function getProviderDisplayName(provider: BridgeProvider): string {
  switch (provider) {
    case 'lifi': return 'LI.FI (Jumper)';
    case 'debridge': return 'deBridge';
    case 'squid': return 'Squid Router';
    case 'across': return 'Across Protocol';
    default: return provider;
  }
}
