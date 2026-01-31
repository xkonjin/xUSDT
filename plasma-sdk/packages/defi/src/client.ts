/**
 * DeFi Client - DefiLlama integration and DeFi operations for AI agents
 * 
 * Enables agents to:
 * - Query protocol TVL and yields
 * - Find best yield opportunities
 * - Execute swaps on DEXs
 * - Implement yield strategies
 */

import type {
  DeFiConfig,
  Protocol,
  YieldPool,
  SwapQuote,
  SwapParams,
  ChainTVL,
  StablecoinData,
  YieldStrategy,
  Token,
} from './types';

const DEFILLAMA_API = 'https://api.llama.fi';
const YIELDS_API = 'https://yields.llama.fi';

// Plasma chain configuration
const PLASMA_CHAIN = 'plasma';
const PLASMA_CHAIN_ID = 98866;

export class DeFiClient {
  private defaultChain: string;
  private preferredProtocols: string[];
  private maxSlippage: number;

  constructor(config: DeFiConfig = {}) {
    this.defaultChain = config.defaultChain || PLASMA_CHAIN;
    this.preferredProtocols = config.preferredProtocols || [];
    this.maxSlippage = config.maxSlippage || 0.5; // 0.5%
  }

  // ============================================================================
  // Protocol & TVL Data
  // ============================================================================

  /**
   * Get all protocols with TVL data
   */
  async getProtocols(): Promise<Protocol[]> {
    const response = await fetch(`${DEFILLAMA_API}/protocols`);
    if (!response.ok) throw new Error('Failed to fetch protocols');
    return response.json();
  }

  /**
   * Get protocols on a specific chain
   */
  async getProtocolsByChain(chain: string = this.defaultChain): Promise<Protocol[]> {
    const protocols = await this.getProtocols();
    return protocols.filter(p => 
      p.chains.map(c => c.toLowerCase()).includes(chain.toLowerCase())
    );
  }

  /**
   * Get TVL for a specific protocol
   */
  async getProtocolTVL(protocolSlug: string): Promise<{
    tvl: number;
    chainTvls: Record<string, number>;
    history: Array<{ date: string; tvl: number }>;
  }> {
    const response = await fetch(`${DEFILLAMA_API}/protocol/${protocolSlug}`);
    if (!response.ok) throw new Error(`Failed to fetch TVL for ${protocolSlug}`);
    const data = await response.json();
    
    return {
      tvl: data.tvl || 0,
      chainTvls: data.chainTvls || {},
      history: data.tvl || [],
    };
  }

  /**
   * Get TVL by chain
   */
  async getChainTVL(): Promise<ChainTVL[]> {
    const response = await fetch(`${DEFILLAMA_API}/chains`);
    if (!response.ok) throw new Error('Failed to fetch chain TVL');
    return response.json();
  }

  /**
   * Get total TVL across all chains
   */
  async getTotalTVL(): Promise<number> {
    const chains = await this.getChainTVL();
    return chains.reduce((sum, chain) => sum + chain.tvl, 0);
  }

  // ============================================================================
  // Yield Data
  // ============================================================================

  /**
   * Get all yield pools
   */
  async getYieldPools(): Promise<YieldPool[]> {
    const response = await fetch(`${YIELDS_API}/pools`);
    if (!response.ok) throw new Error('Failed to fetch yield pools');
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get yield pools on a specific chain
   */
  async getYieldPoolsByChain(chain: string = this.defaultChain): Promise<YieldPool[]> {
    const pools = await this.getYieldPools();
    return pools.filter(p => 
      p.chain.toLowerCase() === chain.toLowerCase()
    );
  }

  /**
   * Find best yield opportunities
   */
  async findBestYields(options: {
    chain?: string;
    minTvl?: number;
    minApy?: number;
    maxRisk?: 'low' | 'medium' | 'high';
    tokens?: string[];
    limit?: number;
  } = {}): Promise<YieldPool[]> {
    const {
      chain = this.defaultChain,
      minTvl = 100000,
      minApy = 1,
      limit = 10,
      tokens,
    } = options;

    let pools = await this.getYieldPoolsByChain(chain);

    // Filter by TVL
    pools = pools.filter(p => p.tvlUsd >= minTvl);

    // Filter by APY
    pools = pools.filter(p => p.apy >= minApy);

    // Filter by tokens if specified
    if (tokens && tokens.length > 0) {
      pools = pools.filter(p => {
        const poolTokens = p.symbol.toLowerCase().split('-');
        return tokens.some(t => poolTokens.includes(t.toLowerCase()));
      });
    }

    // Sort by APY descending
    pools.sort((a, b) => b.apy - a.apy);

    return pools.slice(0, limit);
  }

  /**
   * Get stablecoin yields (lower risk)
   */
  async getStablecoinYields(chain?: string): Promise<YieldPool[]> {
    const stablecoins = ['usdt', 'usdc', 'dai', 'usdt0', 'frax', 'lusd'];
    return this.findBestYields({
      chain,
      tokens: stablecoins,
      minTvl: 500000,
    });
  }

  // ============================================================================
  // Token Prices
  // ============================================================================

  /**
   * Get current token prices
   */
  async getTokenPrices(tokens: string[]): Promise<Record<string, number>> {
    const coinsParam = tokens.join(',');
    const response = await fetch(`${DEFILLAMA_API}/prices/current/${coinsParam}`);
    if (!response.ok) throw new Error('Failed to fetch token prices');
    const data = await response.json();
    
    const prices: Record<string, number> = {};
    for (const [key, value] of Object.entries(data.coins || {})) {
      prices[key] = (value as any).price;
    }
    return prices;
  }

  /**
   * Get historical token price
   */
  async getHistoricalPrice(token: string, timestamp: number): Promise<number | null> {
    const response = await fetch(
      `${DEFILLAMA_API}/prices/historical/${timestamp}/${token}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.coins?.[token]?.price || null;
  }

  // ============================================================================
  // Stablecoins
  // ============================================================================

  /**
   * Get stablecoin data
   */
  async getStablecoins(): Promise<StablecoinData[]> {
    const response = await fetch(`${DEFILLAMA_API}/stablecoins`);
    if (!response.ok) throw new Error('Failed to fetch stablecoins');
    const data = await response.json();
    return data.peggedAssets || [];
  }

  /**
   * Get stablecoin by symbol
   */
  async getStablecoin(symbol: string): Promise<StablecoinData | null> {
    const stablecoins = await this.getStablecoins();
    return stablecoins.find(s => 
      s.symbol.toLowerCase() === symbol.toLowerCase()
    ) || null;
  }

  // ============================================================================
  // DEX Trading (Placeholder - would integrate with actual DEX)
  // ============================================================================

  /**
   * Get swap quote
   */
  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    // In production, this would call a DEX aggregator API
    // For now, return a mock quote
    const { fromToken, toToken, amount } = params;

    return {
      fromToken: {
        address: fromToken,
        symbol: 'USDT0',
        name: 'USDT0',
        decimals: 6,
        chainId: PLASMA_CHAIN_ID,
      },
      toToken: {
        address: toToken,
        symbol: 'XPL',
        name: 'Plasma',
        decimals: 18,
        chainId: PLASMA_CHAIN_ID,
      },
      fromAmount: amount,
      toAmount: '0', // Would be calculated
      priceImpact: 0.1,
      route: [{
        protocol: 'PlasmaSwap',
        fromToken,
        toToken,
        portion: 100,
      }],
      estimatedGas: '100000',
      protocol: 'PlasmaSwap',
    };
  }

  /**
   * Execute swap (would need wallet integration)
   */
  async executeSwap(
    params: SwapParams,
    signer: any // Would be a viem WalletClient
  ): Promise<{ txHash: string }> {
    // In production, this would execute the actual swap
    throw new Error('Swap execution requires wallet integration');
  }

  // ============================================================================
  // Yield Strategies
  // ============================================================================

  /**
   * Generate yield strategy recommendations
   */
  async generateYieldStrategy(options: {
    amount: string;
    token: string;
    riskTolerance: 'low' | 'medium' | 'high';
    timeHorizon: 'short' | 'medium' | 'long';
  }): Promise<YieldStrategy[]> {
    const { amount, token, riskTolerance, timeHorizon } = options;
    const strategies: YieldStrategy[] = [];

    // Get available yields
    const yields = await this.findBestYields({
      tokens: [token],
      minTvl: riskTolerance === 'low' ? 1000000 : 100000,
    });

    if (yields.length === 0) {
      return strategies;
    }

    // Low risk: Single-sided staking
    if (riskTolerance === 'low') {
      const bestStable = yields.find(y => !y.symbol.includes('-'));
      if (bestStable) {
        strategies.push({
          name: 'Single-Sided Staking',
          description: `Deposit ${token} into ${bestStable.project} for stable yields`,
          expectedApy: bestStable.apy,
          risk: 'low',
          steps: [{
            action: 'deposit',
            protocol: bestStable.project,
            description: `Deposit ${amount} ${token}`,
            params: { pool: bestStable.pool, amount },
          }],
          requiredTokens: [token],
          estimatedGas: '200000',
        });
      }
    }

    // Medium risk: LP provision
    if (riskTolerance === 'medium' || riskTolerance === 'high') {
      const bestLP = yields.find(y => y.symbol.includes('-'));
      if (bestLP) {
        const [token1, token2] = bestLP.symbol.split('-');
        strategies.push({
          name: 'Liquidity Provision',
          description: `Provide liquidity to ${bestLP.symbol} pool on ${bestLP.project}`,
          expectedApy: bestLP.apy,
          risk: 'medium',
          steps: [
            {
              action: 'swap',
              protocol: 'PlasmaSwap',
              description: `Swap 50% of ${token} to ${token2}`,
              params: { fromToken: token, toToken: token2, amount: (parseFloat(amount) / 2).toString() },
            },
            {
              action: 'provide_liquidity',
              protocol: bestLP.project,
              description: `Add liquidity to ${bestLP.symbol} pool`,
              params: { pool: bestLP.pool, token1, token2 },
            },
          ],
          requiredTokens: [token],
          estimatedGas: '500000',
        });
      }
    }

    return strategies;
  }

  // ============================================================================
  // Agent-Friendly Methods
  // ============================================================================

  /**
   * Get a summary of DeFi opportunities for an agent
   */
  async getAgentSummary(walletAddress?: string): Promise<{
    topYields: YieldPool[];
    stablecoinYields: YieldPool[];
    totalTVL: number;
    plasmaProtocols: Protocol[];
  }> {
    const [topYields, stablecoinYields, totalTVL, plasmaProtocols] = await Promise.all([
      this.findBestYields({ limit: 5 }),
      this.getStablecoinYields(),
      this.getTotalTVL(),
      this.getProtocolsByChain(PLASMA_CHAIN),
    ]);

    return {
      topYields: topYields.slice(0, 5),
      stablecoinYields: stablecoinYields.slice(0, 5),
      totalTVL,
      plasmaProtocols: plasmaProtocols.slice(0, 10),
    };
  }

  /**
   * Format yield data for agent consumption
   */
  formatYieldForAgent(pool: YieldPool): string {
    return `${pool.project} - ${pool.symbol}: ${pool.apy.toFixed(2)}% APY (TVL: $${(pool.tvlUsd / 1000000).toFixed(2)}M)`;
  }

  /**
   * Get actionable DeFi recommendations
   */
  async getRecommendations(options: {
    balance: string;
    token: string;
    goal: 'maximize_yield' | 'minimize_risk' | 'balanced';
  }): Promise<string[]> {
    const { balance, token, goal } = options;
    const recommendations: string[] = [];

    const riskMap = {
      maximize_yield: 'high' as const,
      minimize_risk: 'low' as const,
      balanced: 'medium' as const,
    };

    const strategies = await this.generateYieldStrategy({
      amount: balance,
      token,
      riskTolerance: riskMap[goal],
      timeHorizon: 'medium',
    });

    for (const strategy of strategies) {
      recommendations.push(
        `${strategy.name}: ${strategy.description} (Expected APY: ${strategy.expectedApy.toFixed(2)}%, Risk: ${strategy.risk})`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No suitable strategies found. Consider holding or bridging to a chain with more opportunities.');
    }

    return recommendations;
  }
}

export default DeFiClient;
