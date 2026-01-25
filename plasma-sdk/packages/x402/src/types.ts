/**
 * X402 Protocol Types
 */

import type { Address, Hex, Hash } from 'viem';

/**
 * Fee breakdown for transparency (optional)
 */
export interface FeeBreakdown {
  /** Original requested amount in atomic units */
  amount: string;
  /** Protocol fee percent in basis points (e.g., 10 = 0.1%) */
  percentBps: number;
  /** Fee from percent only (before any floor), as integer string */
  percentFee: string;
  /** Whether a dynamic floor was applied */
  floorApplied?: boolean;
  /** Final total fee (max(percentFee, floor)) */
  totalFee: string;
}

/**
 * Payment option offered by the server
 */
export interface X402PaymentOption {
  network: string;
  chainId: number;
  token: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: string;
  recipient: Address;
  scheme: 'eip3009-transfer-with-auth' | 'eip3009-receive-with-auth' | 'direct-transfer';
  description?: string;
  
  // Extended fields for advanced routing (optional)
  /** Router contract address for Ethereum routing */
  routerContract?: Address;
  /** NFT collection address for NFT-based routing */
  nftCollection?: Address;
  /** Recommended payment mode */
  recommendedMode?: 'channel' | 'direct';
  /** Detailed fee breakdown for transparency */
  feeBreakdown?: FeeBreakdown;
}

/**
 * Payment Required response (HTTP 402)
 */
export interface X402PaymentRequired {
  type: 'payment-required';
  version: '1.0';
  invoiceId: string;
  timestamp: number;
  paymentOptions: X402PaymentOption[];
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment submitted by client
 */
export interface X402PaymentSubmitted {
  type: 'payment-submitted';
  invoiceId: string;
  chosenOption: X402PaymentOption;
  authorization: {
    from: Address;
    to: Address;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: Hex;
    v: number;
    r: Hex;
    s: Hex;
  };
}

/**
 * Payment completed response
 */
export interface X402PaymentCompleted {
  type: 'payment-completed';
  invoiceId: string;
  txHash: Hash;
  network: string;
  chainId: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

/**
 * Middleware configuration
 */
export interface X402MiddlewareConfig {
  /** Price per request in smallest token units (e.g., 1000000 = 1 USDT) */
  pricePerRequest: bigint | number | string;
  /** Recipient address for payments */
  recipient: Address;
  /** Description shown to users */
  description?: string;
  /** Token address (defaults to USDT0) */
  tokenAddress?: Address;
  /** Token symbol (defaults to USDT0) */
  tokenSymbol?: string;
  /** Token decimals (defaults to 6) */
  tokenDecimals?: number;
  /** Chain ID (defaults to Plasma mainnet) */
  chainId?: number;
  /** Network name (defaults to 'plasma') */
  network?: string;
  /** Facilitator URL for payment verification/settlement */
  facilitatorUrl?: string;
  /** Skip verification (for testing only) */
  skipVerification?: boolean;
}

/**
 * Client configuration
 */
export interface X402ClientConfig {
  /** Wallet for signing payments */
  wallet: {
    address: Address;
    signTypedData: (data: any) => Promise<Hex>;
  };
  /** Base URL of the service */
  baseUrl: string;
  /** Automatic payment on 402 (default: true) */
  autoPayment?: boolean;
  /** Maximum amount willing to pay per request */
  maxAmountPerRequest?: bigint;
  /** Token address to use for payments */
  preferredToken?: Address;
  /** Chain ID preference */
  preferredChainId?: number;
}

/**
 * Verification result from facilitator
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
  details?: {
    from: Address;
    to: Address;
    value: string;
    nonce: Hex;
  };
}

/**
 * Settlement result from facilitator
 */
export interface SettlementResult {
  success: boolean;
  txHash?: Hash;
  error?: string;
  blockNumber?: bigint;
  status?: 'pending' | 'confirmed' | 'failed';
}

/**
 * Headers used in X402 protocol
 */
export const X402_HEADERS = {
  /** Server sends payment requirements in this header */
  PAYMENT_REQUIRED: 'X-Payment-Required',
  /** Client sends payment in this header */
  PAYMENT: 'X-Payment',
  /** Server sends payment receipt in this header */
  PAYMENT_RECEIPT: 'X-Payment-Receipt',
} as const;
