/**
 * DeFi Types - Protocol data, yields, and trading
 */

export interface Protocol {
  id: string;
  name: string;
  symbol?: string;
  category: string;
  chains: string[];
  tvl: number;
  chainTvls: Record<string, number>;
  change1d?: number;
  change7d?: number;
  url?: string;
  logo?: string;
}

export interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase?: number;
  apyReward?: number;
  apy: number;
  rewardTokens?: string[];
  underlyingTokens?: string[];
  poolMeta?: string;
  il7d?: number;
  apyBase7d?: number;
  apyMean30d?: number;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  price?: number;
}

export interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  priceImpact: number;
  route: SwapRoute[];
  estimatedGas: string;
  protocol: string;
}

export interface SwapRoute {
  protocol: string;
  fromToken: string;
  toToken: string;
  portion: number;
}

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
  recipient?: string;
}

export interface DeFiConfig {
  defaultChain?: string;
  preferredProtocols?: string[];
  maxSlippage?: number;
  rpcUrl?: string;
}

export interface ProtocolTVL {
  date: string;
  totalLiquidityUSD: number;
}

export interface ChainTVL {
  chain: string;
  tvl: number;
  protocols: number;
}

export interface StablecoinData {
  id: string;
  name: string;
  symbol: string;
  pegType: string;
  pegMechanism: string;
  circulating: number;
  price: number;
  chains: string[];
}

export interface YieldStrategy {
  name: string;
  description: string;
  expectedApy: number;
  risk: 'low' | 'medium' | 'high';
  steps: StrategyStep[];
  requiredTokens: string[];
  estimatedGas: string;
}

export interface StrategyStep {
  action: 'swap' | 'deposit' | 'stake' | 'provide_liquidity';
  protocol: string;
  description: string;
  params: Record<string, unknown>;
}
