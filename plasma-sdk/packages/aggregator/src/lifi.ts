import { createConfig, getRoutes, executeRoute, getChains, getTokens, type Route } from '@lifi/sdk';
import type { Address, Hash } from 'viem';
import {
  PLASMA_MAINNET_CHAIN_ID,
  USDT0_ADDRESS,
} from '@plasma-pay/core';
import type {
  AggregatorConfig,
  SwapRequest,
  SwapQuote,
  SwapResult,
  TokenInfo,
  SupportedChain,
  RouteUpdateCallback,
} from './types';

const DEFAULT_SLIPPAGE = 0.005; // 0.5%

export class PlasmaAggregator {
  private initialized = false;
  private integrator: string;
  private apiKey?: string;

  constructor(config: AggregatorConfig = {}) {
    this.integrator = config.integrator || 'PlasmaSDK';
    this.apiKey = config.apiKey;
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    createConfig({
      integrator: this.integrator,
      apiKey: this.apiKey,
    });

    this.initialized = true;
  }

  async getQuote(request: SwapRequest): Promise<SwapQuote | null> {
    await this.init();

    // LI.FI API requires lowercase addresses
    const routesResult = await getRoutes({
      fromChainId: request.fromChainId,
      fromTokenAddress: request.fromTokenAddress.toLowerCase() as Address,
      fromAmount: request.fromAmount,
      fromAddress: request.userAddress.toLowerCase() as Address,
      toChainId: PLASMA_MAINNET_CHAIN_ID,
      toTokenAddress: USDT0_ADDRESS.toLowerCase() as Address,
      toAddress: request.recipientAddress.toLowerCase() as Address,
      options: {
        slippage: request.slippage ?? DEFAULT_SLIPPAGE,
        order: 'RECOMMENDED',
      },
    });

    if (!routesResult.routes?.length) {
      return null;
    }

    const best = routesResult.routes[0];
    const totalTime = best.steps.reduce(
      (acc, step) => acc + (step.estimate?.executionDuration || 0),
      0
    );

    return {
      fromChainId: request.fromChainId,
      fromTokenAddress: request.fromTokenAddress,
      fromAmount: request.fromAmount,
      toChainId: PLASMA_MAINNET_CHAIN_ID,
      toTokenAddress: USDT0_ADDRESS,
      toAmount: best.toAmount,
      toAmountMin: best.toAmountMin,
      estimatedGasUsd: best.gasCostUSD || '0',
      estimatedTimeSeconds: totalTime,
      priceImpact: (best.steps[0]?.estimate as { priceImpact?: string })?.priceImpact || '0',
      routeId: best.id,
    };
  }

  async convertToUSDT0(
    request: SwapRequest,
    onUpdate?: RouteUpdateCallback
  ): Promise<SwapResult> {
    await this.init();

    try {
      // LI.FI API requires lowercase addresses
      const routesResult = await getRoutes({
        fromChainId: request.fromChainId,
        fromTokenAddress: request.fromTokenAddress.toLowerCase() as Address,
        fromAmount: request.fromAmount,
        fromAddress: request.userAddress.toLowerCase() as Address,
        toChainId: PLASMA_MAINNET_CHAIN_ID,
        toTokenAddress: USDT0_ADDRESS.toLowerCase() as Address,
        toAddress: request.recipientAddress.toLowerCase() as Address,
        options: {
          slippage: request.slippage ?? DEFAULT_SLIPPAGE,
          order: 'RECOMMENDED',
        },
      });

      if (!routesResult.routes?.length) {
        return { success: false, error: 'No routes available' };
      }

      const bestRoute = routesResult.routes[0];

      const executedRoute = await executeRoute(bestRoute, {
        updateRouteHook: (route: Route) => {
          onUpdate?.(route.id, (route.steps[0] as { execution?: { status?: string } })?.execution?.status || 'unknown');
        },
      });

      const lastStep = executedRoute.steps[executedRoute.steps.length - 1];
      const txHash = lastStep?.execution?.process?.[0]?.txHash as Hash | undefined;

      return {
        success: true,
        txHash,
        amountReceived: bestRoute.toAmountMin,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed',
      };
    }
  }

  async getSupportedChains(): Promise<SupportedChain[]> {
    await this.init();

    const chains = await getChains();
    return chains.map((chain) => ({
      chainId: chain.id,
      name: chain.name,
      logoURI: chain.logoURI,
    }));
  }

  async getTokensForChain(chainId: number): Promise<TokenInfo[]> {
    await this.init();

    const result = await getTokens({ chains: [chainId] });
    const tokens = result.tokens[chainId] || [];

    return tokens.map((token) => ({
      chainId: token.chainId,
      address: token.address as Address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
    }));
  }

  async getPopularTokens(chainId: number, limit: number = 10): Promise<TokenInfo[]> {
    const tokens = await this.getTokensForChain(chainId);
    
    const popularSymbols = ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE', 'CRV'];
    const popular = tokens.filter((t) => popularSymbols.includes(t.symbol.toUpperCase()));
    
    return popular.slice(0, limit);
  }
}

let defaultAggregator: PlasmaAggregator | null = null;

export function getAggregator(config?: AggregatorConfig): PlasmaAggregator {
  if (!defaultAggregator) {
    defaultAggregator = new PlasmaAggregator(config);
  }
  return defaultAggregator;
}

export async function convertToUSDT0(
  request: SwapRequest,
  onUpdate?: RouteUpdateCallback
): Promise<SwapResult> {
  return getAggregator().convertToUSDT0(request, onUpdate);
}

export async function getQuote(request: SwapRequest): Promise<SwapQuote | null> {
  return getAggregator().getQuote(request);
}
