/**
 * @plasma-pay/gas-manager - Type definitions
 * 
 * Types for auto gas management on Plasma
 */

import type { Address, Hex } from 'viem';

// ============================================================================
// Configuration Types
// ============================================================================

export interface GasManagerConfig {
  /**
   * Plasma RPC URL
   * @default "https://rpc.plasma.xyz"
   */
  plasmaRpcUrl?: string;

  /**
   * Minimum XPL balance to maintain (in wei)
   * @default 0.01 XPL (10^16 wei)
   */
  minBalance?: bigint;

  /**
   * Target XPL balance when refilling (in wei)
   * @default 0.05 XPL (5 * 10^16 wei)
   */
  targetBalance?: bigint;

  /**
   * USDT0 amount to swap for gas refill (in atomic units)
   * @default 0.10 USDT0 (100000)
   */
  refillAmount?: bigint;

  /**
   * Enable automatic refill when balance is low
   * @default true
   */
  autoRefill?: boolean;

  /**
   * Check interval in milliseconds
   * @default 60000 (1 minute)
   */
  checkInterval?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

// ============================================================================
// Balance Types
// ============================================================================

export interface GasBalance {
  /**
   * XPL balance in wei
   */
  balance: bigint;

  /**
   * XPL balance formatted (human readable)
   */
  balanceFormatted: string;

  /**
   * Whether balance is above minimum threshold
   */
  isHealthy: boolean;

  /**
   * Whether balance is critically low (< 10% of minimum)
   */
  isCritical: boolean;

  /**
   * Estimated number of transactions possible
   */
  estimatedTxCount: number;
}

export interface RefillResult {
  /**
   * Whether refill was successful
   */
  success: boolean;

  /**
   * Transaction hash if successful
   */
  txHash?: Hex;

  /**
   * Amount of XPL received
   */
  amountReceived?: bigint;

  /**
   * Amount of USDT0 spent
   */
  amountSpent?: bigint;

  /**
   * Error message if failed
   */
  error?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type GasManagerEvent =
  | { type: 'balance_checked'; data: GasBalance }
  | { type: 'balance_low'; data: GasBalance }
  | { type: 'balance_critical'; data: GasBalance }
  | { type: 'refill_started'; amount: bigint }
  | { type: 'refill_completed'; data: RefillResult }
  | { type: 'refill_failed'; error: string };

export type GasManagerEventHandler = (event: GasManagerEvent) => void;

// ============================================================================
// Constants
// ============================================================================

export const PLASMA_CHAIN_ID = 9745;
export const PLASMA_RPC_URL = 'https://rpc.plasma.xyz';

// Default gas values
export const DEFAULT_MIN_BALANCE = BigInt(10_000_000_000_000_000); // 0.01 XPL
export const DEFAULT_TARGET_BALANCE = BigInt(50_000_000_000_000_000); // 0.05 XPL
export const DEFAULT_REFILL_AMOUNT = BigInt(100_000); // 0.10 USDT0

// Gas estimates (in wei)
export const ESTIMATED_TX_GAS = BigInt(21_000);
export const ESTIMATED_ERC20_GAS = BigInt(65_000);
export const ESTIMATED_GAS_PRICE = BigInt(1_000_000_000); // 1 gwei

// Token addresses
export const USDT0_ADDRESS = '0x0000000000000000000000000000000000000000' as Address; // TODO: Replace
export const XPL_ADDRESS = '0x0000000000000000000000000000000000000000' as Address; // Native token

// Swap router for USDT0 -> XPL
export const GAS_SWAP_ROUTER = '0x0000000000000000000000000000000000000000' as Address; // TODO: Replace
