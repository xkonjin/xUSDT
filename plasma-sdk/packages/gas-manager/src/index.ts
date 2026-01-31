/**
 * @plasma-pay/gas-manager
 * 
 * Auto gas management for self-sovereign agent operation on Plasma
 * Ensures agents always have XPL for transactions without relying on a relayer
 * 
 * @example
 * ```typescript
 * import { PlasmaGasManager } from '@plasma-pay/gas-manager';
 * 
 * const gasManager = new PlasmaGasManager({
 *   privateKey: process.env.WALLET_KEY,
 *   autoRefill: true,
 * });
 * 
 * // Start automatic monitoring
 * gasManager.startMonitoring();
 * 
 * // Or manually check and refill
 * const balance = await gasManager.getBalance();
 * if (!balance.isHealthy) {
 *   await gasManager.refill();
 * }
 * ```
 */

// Main client
export { PlasmaGasManager, hasEnoughGas } from './client';

// Types
export type {
  GasManagerConfig,
  GasBalance,
  RefillResult,
  GasManagerEvent,
  GasManagerEventHandler,
} from './types';

// Constants
export {
  PLASMA_CHAIN_ID,
  PLASMA_RPC_URL,
  DEFAULT_MIN_BALANCE,
  DEFAULT_TARGET_BALANCE,
  DEFAULT_REFILL_AMOUNT,
  ESTIMATED_TX_GAS,
  ESTIMATED_ERC20_GAS,
  ESTIMATED_GAS_PRICE,
  USDT0_ADDRESS,
  GAS_SWAP_ROUTER,
} from './types';

// Version
export const VERSION = '1.0.0';
