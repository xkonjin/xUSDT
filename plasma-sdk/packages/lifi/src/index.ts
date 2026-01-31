/**
 * @plasma-pay/lifi
 * 
 * Cross-chain swap module for Plasma Pay
 * Accept any token on any chain, convert to USDT0 on Plasma
 * 
 * @example
 * ```typescript
 * import { PlasmaLiFiClient } from '@plasma-pay/lifi';
 * 
 * const lifi = new PlasmaLiFiClient({
 *   privateKey: process.env.WALLET_KEY,
 * });
 * 
 * // Swap 1 ETH on Ethereum to USDT0 on Plasma
 * const result = await lifi.swap({
 *   fromChainId: 1,
 *   fromToken: '0x0000000000000000000000000000000000000000',
 *   fromAmount: '1000000000000000000',
 *   fromAddress: '0x...',
 * });
 * ```
 */

// Main client
export { PlasmaLiFiClient, getPlasmaSwapQuote } from './client';

// Types
export type {
  LiFiConfig,
  SwapRequest,
  SwapQuote,
  SwapResult,
  SwapStep,
  TokenInfo,
  ChainInfo,
} from './types';

// Constants
export {
  PLASMA_CHAIN_ID,
  NATIVE_TOKEN_ADDRESS,
  USDT0_ADDRESS_PLASMA,
  COMMON_TOKENS,
  SUPPORTED_SOURCE_CHAINS,
} from './types';

// Version
export const VERSION = '1.0.0';
