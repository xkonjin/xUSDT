// LI.FI (legacy single-provider)
export {
  PlasmaAggregator,
  getAggregator,
  convertToUSDT0,
  getQuote,
} from './lifi';

// Multi-Provider Aggregator (recommended)
export {
  MultiAggregator,
  getMultiAggregator,
  getBestBridgeQuote,
  getQuickBridgeQuote,
  getBridgeTransaction,
  getBridgeStatus,
  formatQuote,
  getProviderDisplayName,
} from './multi-aggregator';

// Individual Providers (for direct access)
export {
  getSquidQuote,
  getSquidTransaction,
  getSquidStatus,
  getSquidSupportedChains,
  getSquidTokens,
} from './squid';

export {
  getAcrossQuote,
  getAcrossTransaction,
  getAcrossStatus,
  getAcrossSupportedChains,
  isAcrossSupported,
} from './across';

export {
  getDebridgeQuote,
  getDebridgeTransaction,
  getDebridgeStatus,
  getDebridgeSupportedChains,
  isDebridgeSupported,
} from './debridge';

// Types
export type {
  AggregatorConfig,
  SwapRequest,
  SwapQuote,
  SwapResult,
  TokenInfo,
  SupportedChain,
  RouteUpdateCallback,
  // New bridge types
  BridgeProvider,
  QuoteParams,
  BridgeQuote,
  BridgeTransaction,
  BridgeStatus,
  MultiAggregatorQuoteResult,
  ChainInfo,
} from './types';

// Constants
export {
  POPULAR_SOURCE_CHAINS,
  POPULAR_TOKENS,
} from './types';
