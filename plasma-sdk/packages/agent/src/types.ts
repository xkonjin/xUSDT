/**
 * @plasma-pay/agent - Type definitions
 * 
 * Core types for the Plasma Pay SDK
 */

import type { Hex, Address } from 'viem';

// ============================================================================
// Configuration Types
// ============================================================================

export interface PlasmaPayConfig {
  /**
   * Private key for signing payments (hex string with 0x prefix)
   * Either privateKey or wallet must be provided
   */
  privateKey?: Hex;

  /**
   * Custom wallet implementation for signing
   * Use this for hardware wallets, MPC wallets, or custom signers
   */
  wallet?: PlasmaWallet;

  /**
   * Facilitator URL for payment verification and settlement
   * @default "https://pay.plasma.xyz"
   */
  facilitatorUrl?: string;

  /**
   * Plasma RPC URL
   * @default "https://rpc.plasma.xyz"
   */
  plasmaRpcUrl?: string;

  /**
   * Maximum amount (in USDT0 atomic units) to auto-pay per request
   * @default 1_000_000 (1 USDT0)
   */
  maxAmountPerRequest?: bigint;

  /**
   * Whether to automatically pay on 402 responses
   * @default true
   */
  autoPayment?: boolean;

  /**
   * Preferred network for payments
   * @default "plasma"
   */
  preferredNetwork?: 'plasma' | 'base' | 'ethereum';

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Auto-manage gas (convert USDT0 to XPL when needed)
   * @default true
   */
  autoGas?: boolean;

  /**
   * Minimum XPL balance to maintain for gas
   * @default 0.01 XPL (10^16 wei)
   */
  minGasBalance?: bigint;
}

export interface PlasmaWallet {
  address: Address;
  signTypedData: (data: EIP712TypedData) => Promise<Hex>;
  signMessage?: (message: string) => Promise<Hex>;
}

// ============================================================================
// X402 Protocol Types
// ============================================================================

export interface PaymentRequired {
  type: 'payment-required';
  version: string;
  invoiceId: string;
  paymentOptions: PaymentOption[];
  metadata?: Record<string, unknown>;
}

export interface PaymentOption {
  /** CAIP-2 network identifier (e.g., "eip155:9745" for Plasma) */
  network: string;
  /** CAIP-19 asset identifier */
  asset: string;
  /** Chain ID */
  chainId: number;
  /** Token contract address */
  token: Address;
  /** Amount in atomic units */
  amount: string;
  /** Recipient address */
  recipient: Address;
  /** Payment scheme */
  scheme: PaymentScheme;
  /** Payment deadline (unix timestamp) */
  deadline: number;
  /** Optional router contract for gasless payments */
  routerContract?: Address;
  /** Optional nonce for EIP-3009 */
  nonce?: Hex;
}

export type PaymentScheme = 
  | 'eip3009-transfer-with-auth'
  | 'eip3009-receive'
  | 'erc20-gasless-router'
  | 'direct-transfer';

export interface PaymentSubmitted {
  type: 'payment-submitted';
  invoiceId: string;
  authorization: EIP3009Authorization | RouterAuthorization;
  scheme: PaymentScheme;
}

export interface EIP3009Authorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
  v: number;
  r: Hex;
  s: Hex;
}

export interface RouterAuthorization {
  from: Address;
  to: Address;
  amount: string;
  nonce: number;
  deadline: number;
  v: number;
  r: Hex;
  s: Hex;
}

export interface PaymentReceipt {
  type: 'payment-completed';
  invoiceId: string;
  txHash: Hex;
  timestamp: number;
  amount: string;
  token: Address;
  network: string;
}

// ============================================================================
// EIP-712 Types
// ============================================================================

export interface EIP712TypedData {
  types: Record<string, EIP712Type[]>;
  primaryType: string;
  domain: EIP712Domain;
  message: Record<string, unknown>;
}

export interface EIP712Type {
  name: string;
  type: string;
}

export interface EIP712Domain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: Address;
  salt?: Hex;
}

// ============================================================================
// Balance and Gas Types
// ============================================================================

export interface BalanceInfo {
  /** USDT0 balance in atomic units */
  usdt0: bigint;
  /** XPL (native gas) balance in wei */
  xpl: bigint;
  /** Formatted USDT0 balance (human readable) */
  usdt0Formatted: string;
  /** Formatted XPL balance (human readable) */
  xplFormatted: string;
  /** Whether user has enough gas for transactions */
  hasGas: boolean;
}

export interface GasEstimate {
  /** Estimated gas in wei */
  gasLimit: bigint;
  /** Gas price in wei */
  gasPrice: bigint;
  /** Total cost in wei */
  totalCost: bigint;
  /** Total cost in XPL (formatted) */
  totalCostFormatted: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class PlasmaPayError extends Error {
  code: PlasmaPayErrorCode;
  details?: Record<string, unknown>;

  constructor(code: PlasmaPayErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PlasmaPayError';
    this.code = code;
    this.details = details;
  }
}

export type PlasmaPayErrorCode =
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_GAS'
  | 'PAYMENT_REJECTED'
  | 'PAYMENT_EXPIRED'
  | 'INVALID_SIGNATURE'
  | 'NETWORK_ERROR'
  | 'FACILITATOR_ERROR'
  | 'AMOUNT_EXCEEDS_MAX'
  | 'UNSUPPORTED_SCHEME'
  | 'WALLET_NOT_CONFIGURED'
  | 'INVALID_CONFIG';

// ============================================================================
// Event Types
// ============================================================================

export type PlasmaPayEvent =
  | { type: 'payment_required'; data: PaymentRequired }
  | { type: 'payment_submitted'; data: PaymentSubmitted }
  | { type: 'payment_completed'; data: PaymentReceipt }
  | { type: 'payment_failed'; error: PlasmaPayError }
  | { type: 'gas_low'; balance: bigint }
  | { type: 'gas_refilled'; txHash: Hex };

export type PlasmaPayEventHandler = (event: PlasmaPayEvent) => void;

// ============================================================================
// Chain Constants
// ============================================================================

export const PLASMA_CHAIN_ID = 9745;
export const PLASMA_RPC_URL = 'https://rpc.plasma.xyz';
export const USDT0_ADDRESS = '0x0000000000000000000000000000000000000000' as Address; // TODO: Replace with actual
export const USDT0_DECIMALS = 6;
export const XPL_DECIMALS = 18;

// CAIP-2 identifiers
export const PLASMA_CAIP2 = 'eip155:9745';
export const BASE_CAIP2 = 'eip155:8453';
export const ETHEREUM_CAIP2 = 'eip155:1';
