/**
 * @plasma-pay/lifi - LiFi Swap Client
 * 
 * Cross-chain swap module for converting any token to USDT0 on Plasma
 */

import { 
  createConfig, 
  getQuote, 
  executeRoute,
  getChains,
  getTokens,
  type QuoteRequest,
  type Route,
} from '@lifi/sdk';
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  formatUnits,
  type WalletClient,
  type PublicClient,
  type Address,
  type Hex,
  privateKeyToAccount,
} from 'viem';
import type {
  LiFiConfig,
  SwapRequest,
  SwapQuote,
  SwapResult,
  SwapStep,
  TokenInfo,
  ChainInfo,
} from './types';
import {
  PLASMA_CHAIN_ID,
  USDT0_ADDRESS_PLASMA,
  NATIVE_TOKEN_ADDRESS,
  COMMON_TOKENS,
  SUPPORTED_SOURCE_CHAINS,
} from './types';

// Default configuration
const DEFAULT_CONFIG: LiFiConfig = {
  integrator: 'PlasmaPaySDK',
  slippage: 0.5,
  maxPriceImpact: 2,
  debug: false,
};

/**
 * PlasmaLiFiClient - Cross-chain swap module
 * 
 * Enables agents to accept any token on any chain and convert to USDT0 on Plasma
 * 
 * @example
 * ```typescript
 * const lifi = new PlasmaLiFiClient({
 *   privateKey: process.env.WALLET_KEY,
 * });
 * 
 * // Get a quote for swapping ETH on Ethereum to USDT0 on Plasma
 * const quote = await lifi.getSwapQuote({
 *   fromChainId: 1,
 *   fromToken: '0x0000000000000000000000000000000000000000', // ETH
 *   fromAmount: '1000000000000000000', // 1 ETH
 *   fromAddress: '0x...',
 * });
 * 
 * // Execute the swap
 * const result = await lifi.executeSwap(quote);
 * ```
 */
export class PlasmaLiFiClient {
  private config: LiFiConfig;
  private walletClient: WalletClient | null = null;
  private publicClients: Map<number, PublicClient> = new Map();
  private initialized = false;

  constructor(config: LiFiConfig & { privateKey?: Hex } = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize LiFi SDK
    createConfig({
      integrator: this.config.integrator || 'PlasmaPaySDK',
    });

    // Initialize wallet if private key provided
    if (config.privateKey) {
      const account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account,
        transport: http(),
      });
    }

    this.initialized = true;
    this.log('PlasmaLiFiClient initialized');
  }

  /**
   * Get a quote for swapping any token to USDT0 on Plasma
   */
  async getSwapQuote(request: SwapRequest): Promise<SwapQuote> {
    this.log('Getting swap quote', request);

    // Default to Plasma and USDT0 as destination
    const toChainId = request.toChainId || PLASMA_CHAIN_ID;
    const toToken = request.toToken || USDT0_ADDRESS_PLASMA;
    const toAddress = request.toAddress || request.fromAddress;

    // Build LiFi quote request
    const quoteRequest: QuoteRequest = {
      fromChain: request.fromChainId,
      toChain: toChainId,
      fromToken: request.fromToken,
      toToken: toToken,
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      toAddress: toAddress,
      slippage: this.config.slippage! / 100, // Convert to decimal
    };

    try {
      const quote = await getQuote(quoteRequest);
      return this.formatQuote(quote);
    } catch (error: any) {
      this.log('Quote error', { error: error.message });
      throw new Error(`Failed to get swap quote: ${error.message}`);
    }
  }

  /**
   * Execute a swap using a previously obtained quote
   */
  async executeSwap(quote: SwapQuote): Promise<SwapResult> {
    if (!this.walletClient) {
      throw new Error('Wallet not configured. Provide privateKey in constructor.');
    }

    this.log('Executing swap', { quoteId: quote.id });

    try {
      const route = quote.rawRoute as Route;
      
      // Execute the route
      const result = await executeRoute(route, {
        // Update callback for progress tracking
        updateRouteHook: (updatedRoute) => {
          this.log('Route update', { 
            status: updatedRoute.steps[0]?.execution?.status 
          });
        },
      });

      // Check final status
      const lastStep = result.steps[result.steps.length - 1];
      const execution = lastStep?.execution;

      if (execution?.status === 'DONE') {
        return {
          sourceTxHash: execution.process[0]?.txHash as Hex,
          destinationTxHash: execution.process[execution.process.length - 1]?.txHash as Hex,
          status: 'success',
          amountReceived: lastStep?.estimate?.toAmount,
        };
      } else if (execution?.status === 'FAILED') {
        return {
          sourceTxHash: execution.process[0]?.txHash as Hex,
          status: 'failed',
          error: execution.process.find(p => p.error)?.error?.message || 'Unknown error',
        };
      } else {
        return {
          sourceTxHash: execution?.process[0]?.txHash as Hex,
          status: 'pending',
        };
      }
    } catch (error: any) {
      this.log('Swap execution error', { error: error.message });
      throw new Error(`Swap execution failed: ${error.message}`);
    }
  }

  /**
   * Get quote and execute in one call
   */
  async swap(request: SwapRequest): Promise<SwapResult> {
    const quote = await this.getSwapQuote(request);
    return this.executeSwap(quote);
  }

  /**
   * Get supported chains for swapping to Plasma
   */
  async getSupportedChains(): Promise<ChainInfo[]> {
    try {
      const chains = await getChains();
      return chains
        .filter(chain => SUPPORTED_SOURCE_CHAINS.includes(chain.id))
        .map(chain => ({
          id: chain.id,
          name: chain.name,
          nativeCurrency: {
            symbol: chain.nativeToken?.symbol || 'ETH',
            decimals: chain.nativeToken?.decimals || 18,
          },
          logoURI: chain.logoURI,
        }));
    } catch (error: any) {
      this.log('Failed to get chains', { error: error.message });
      return [];
    }
  }

  /**
   * Get tokens available on a specific chain
   */
  async getTokensOnChain(chainId: number): Promise<TokenInfo[]> {
    try {
      const result = await getTokens({ chains: [chainId] });
      const tokens = result.tokens[chainId] || [];
      
      return tokens.map(token => ({
        address: token.address as Address,
        chainId: token.chainId,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        priceUsd: token.priceUSD,
      }));
    } catch (error: any) {
      this.log('Failed to get tokens', { error: error.message });
      return [];
    }
  }

  /**
   * Get common token address on a chain
   */
  getCommonToken(chainId: number, symbol: string): Address | null {
    const chainTokens = COMMON_TOKENS[chainId];
    if (!chainTokens) return null;
    return chainTokens[symbol.toUpperCase()] || null;
  }

  /**
   * Check if a chain is supported for swaps to Plasma
   */
  isChainSupported(chainId: number): boolean {
    return SUPPORTED_SOURCE_CHAINS.includes(chainId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private formatQuote(quote: any): SwapQuote {
    const route = quote as Route;
    const action = route.steps[0]?.action;
    const estimate = route.steps[0]?.estimate;

    return {
      id: route.id,
      from: {
        chainId: action?.fromChainId || 0,
        token: action?.fromToken?.address as Address,
        amount: action?.fromAmount || '0',
        amountFormatted: formatUnits(
          BigInt(action?.fromAmount || '0'),
          action?.fromToken?.decimals || 18
        ),
        symbol: action?.fromToken?.symbol || 'UNKNOWN',
      },
      to: {
        chainId: action?.toChainId || PLASMA_CHAIN_ID,
        token: action?.toToken?.address as Address,
        amount: estimate?.toAmount || '0',
        amountFormatted: formatUnits(
          BigInt(estimate?.toAmount || '0'),
          action?.toToken?.decimals || 6
        ),
        symbol: action?.toToken?.symbol || 'USDT0',
      },
      estimatedTime: route.steps.reduce((acc, step) => 
        acc + (step.estimate?.executionDuration || 0), 0
      ),
      gasCostUsd: route.gasCostUSD || '0',
      priceImpact: parseFloat(estimate?.priceImpact || '0'),
      exchangeRate: this.calculateExchangeRate(
        action?.fromAmount,
        estimate?.toAmount,
        action?.fromToken?.decimals,
        action?.toToken?.decimals
      ),
      steps: route.steps.map(step => ({
        type: step.type as 'swap' | 'bridge' | 'cross',
        tool: step.tool,
        fromChainId: step.action?.fromChainId || 0,
        toChainId: step.action?.toChainId || 0,
        fromToken: step.action?.fromToken?.symbol || '',
        toToken: step.action?.toToken?.symbol || '',
        estimatedTime: step.estimate?.executionDuration || 0,
      })),
      rawRoute: route,
    };
  }

  private calculateExchangeRate(
    fromAmount?: string,
    toAmount?: string,
    fromDecimals?: number,
    toDecimals?: number
  ): string {
    if (!fromAmount || !toAmount) return '0';
    
    const from = parseFloat(formatUnits(BigInt(fromAmount), fromDecimals || 18));
    const to = parseFloat(formatUnits(BigInt(toAmount), toDecimals || 6));
    
    if (from === 0) return '0';
    return (to / from).toFixed(6);
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log(`[PlasmaLiFiClient] ${message}`, data || '');
    }
  }
}

/**
 * Convenience function to create a swap quote
 */
export async function getPlasmaSwapQuote(
  request: SwapRequest,
  config?: LiFiConfig
): Promise<SwapQuote> {
  const client = new PlasmaLiFiClient(config);
  return client.getSwapQuote(request);
}
