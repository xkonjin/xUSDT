/**
 * Core Types for Plasma SDK
 */

import type { Address, Hash, Hex } from 'viem';

// ============================================
// Network Types
// ============================================

export type PlasmaNetwork = 'mainnet' | 'testnet';

export interface PlasmaChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  usdt0Address: Address;
}

// ============================================
// Wallet Types
// ============================================

export interface PlasmaWallet {
  address: Address;
  signTypedData: (data: TypedDataParams) => Promise<Hex>;
  signMessage?: (message: string) => Promise<Hex>;
}

export interface TypedDataParams {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: Record<string, { name: string; type: string }[]> | Record<string, readonly { readonly name: string; readonly type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

// ============================================
// EIP-3009 Types
// ============================================

export interface TransferWithAuthorizationParams {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
}

export interface SignedTransferAuthorization extends TransferWithAuthorizationParams {
  signature: Hex;
  v: number;
  r: Hex;
  s: Hex;
}

export interface EIP3009TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: {
    TransferWithAuthorization: readonly { readonly name: string; readonly type: string }[];
  };
  primaryType: 'TransferWithAuthorization';
  message: {
    from: Address;
    to: Address;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: Hex;
  };
}

// ============================================
// Payment Types
// ============================================

export interface PaymentOption {
  network: 'plasma' | 'ethereum' | 'base';
  chainId: number;
  token: Address;
  tokenSymbol: string;
  amount: string;
  decimals: number;
  recipient: Address;
  scheme: 'eip3009-transfer-with-auth' | 'eip712-permit' | 'direct-transfer';
}

export interface PaymentRequired {
  type: 'payment-required';
  invoiceId: string;
  timestamp: number;
  paymentOptions: PaymentOption[];
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentSubmitted {
  type: 'payment-submitted';
  invoiceId: string;
  chosenOption: PaymentOption;
  signature: {
    v: number;
    r: Hex;
    s: Hex;
  };
  scheme: string;
  typedData?: EIP3009TypedData;
}

export interface PaymentCompleted {
  type: 'payment-completed';
  invoiceId: string;
  txHash: Hash;
  network: string;
  status: 'success' | 'failed' | 'pending';
  receipt?: TransactionReceipt;
  tokenId?: string; // For NFT receipts
}

export interface TransactionReceipt {
  transactionHash: Hash;
  blockNumber: bigint;
  blockHash: Hash;
  from: Address;
  to: Address;
  gasUsed: bigint;
  status: 'success' | 'reverted';
}

// ============================================
// Stream Types (for Plasma Stream)
// ============================================

export interface StreamConfig {
  recipient: Address;
  depositAmount: bigint;
  duration: number; // seconds
  cliffDuration: number; // seconds (0 for no cliff)
  cliffPercent: number; // 0-100
  cancelable: boolean;
  name?: string;
}

export interface Stream {
  id: bigint;
  sender: Address;
  recipient: Address;
  depositAmount: bigint;
  withdrawnAmount: bigint;
  startTime: number;
  endTime: number;
  cliffTime: number;
  cliffAmount: bigint;
  ratePerSecond: bigint;
  cancelable: boolean;
  active: boolean;
}

export interface StreamWithdrawable {
  streamId: bigint;
  withdrawable: bigint;
  withdrawn: bigint;
  remaining: bigint;
  percentComplete: number;
}

// ============================================
// Subscription Types (for Plasma Subscribe)
// ============================================

export interface SubscriptionTier {
  id: string;
  name: string;
  amount: bigint;
  billingCycle: number; // seconds (default 30 days)
  description?: string;
  benefits?: string[];
}

export interface SubscriptionAuth {
  subscriber: Address;
  creator: Address;
  amount: bigint;
  maxPayments: number; // 0 = unlimited
  validUntil: number;
  nonce: Hex;
}

export interface Subscription {
  id: Hex;
  subscriber: Address;
  creator: Address;
  amount: bigint;
  startTime: number;
  lastPayment: number;
  billingCycle: number;
  active: boolean;
  paymentCount: number;
}

// ============================================
// Aggregator Types (for token swaps)
// ============================================

export interface SwapQuote {
  fromChainId: number;
  fromTokenAddress: Address;
  fromAmount: string;
  toChainId: number;
  toTokenAddress: Address;
  toAmount: string;
  toAmountMin: string;
  estimatedGasUsd: string;
  estimatedTimeSeconds: number;
  route: SwapRoute;
}

export interface SwapRoute {
  id: string;
  steps: SwapStep[];
}

export interface SwapStep {
  type: 'swap' | 'bridge';
  tool: string;
  fromChainId: number;
  toChainId: number;
  fromToken: Address;
  toToken: Address;
  fromAmount: string;
  toAmount: string;
}

export interface SwapRequest {
  fromChainId: number;
  fromTokenAddress: Address;
  fromAmount: string;
  userAddress: Address;
  recipientAddress: Address;
  slippage?: number;
}

export interface SwapResult {
  success: boolean;
  txHash?: Hash;
  amountReceived?: string;
  error?: string;
}
