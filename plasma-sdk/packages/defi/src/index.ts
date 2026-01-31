/**
 * @plasma-pay/defi
 * 
 * DeFi integration for Plasma Pay - DefiLlama, DEX trading, yield strategies
 * 
 * @example
 * ```typescript
 * import { DeFiClient } from '@plasma-pay/defi';
 * 
 * const defi = new DeFiClient();
 * 
 * // Find best yields
 * const yields = await defi.findBestYields({ minApy: 5 });
 * 
 * // Get recommendations
 * const recs = await defi.getRecommendations({
 *   balance: '1000',
 *   token: 'USDT0',
 *   goal: 'balanced',
 * });
 * ```
 */

export { DeFiClient, default } from './client';
export * from './types';
