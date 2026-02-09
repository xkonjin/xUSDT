/**
 * @plasma-pay/facilitator - Type Definitions
 *
 * These types implement the FacilitatorEvmSigner interface from @x402/evm
 * for Plasma chain USDT0 payments.
 */

// ============================================================================
// Core Types
// ============================================================================

/** Hex string type for addresses and hashes */
export type Hex = `0x${string}`;

/** Address type - 20 bytes hex */
export type Address = Hex;

/** Transaction hash type - 32 bytes hex */
export type TransactionHash = Hex;

/** Signature type - 65 bytes hex (r + s + v) */
export type Signature = Hex;

// ============================================================================
// Chain Configuration
// ============================================================================

export interface PlasmaChainConfig {
  /** Chain ID for Plasma mainnet (98866) */
  chainId: number;
  /** Chain name */
  name: string;
  /** RPC URL */
  rpcUrl: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** USDT0 contract address */
  usdt0Address: Address;
  /** Native token symbol (XPL) */
  nativeSymbol: string;
}

export const PLASMA_MAINNET: PlasmaChainConfig = {
  chainId: 98866,
  name: "Plasma",
  rpcUrl: "https://rpc.plasma.io",
  explorerUrl: "https://explorer.plasma.io",
  usdt0Address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb" as Address,
  nativeSymbol: "XPL",
};

// ============================================================================
// EIP-3009 Types
// ============================================================================

/** EIP-3009 TransferWithAuthorization parameters */
export interface TransferWithAuthorizationParams {
  /** Token holder address */
  from: Address;
  /** Recipient address */
  to: Address;
  /** Amount in smallest unit (6 decimals for USDT0) */
  value: bigint;
  /** Unix timestamp after which the authorization is valid */
  validAfter: bigint;
  /** Unix timestamp before which the authorization is valid */
  validBefore: bigint;
  /** Unique nonce (32 bytes) */
  nonce: Hex;
}

/** EIP-3009 signed authorization */
export interface SignedAuthorization extends TransferWithAuthorizationParams {
  /** v component of signature */
  v: number;
  /** r component of signature */
  r: Hex;
  /** s component of signature */
  s: Hex;
}

// ============================================================================
// EIP-712 Types
// ============================================================================

/** EIP-712 Domain */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

/** EIP-712 Type definition */
export interface EIP712TypeDefinition {
  name: string;
  type: string;
}

/** EIP-712 Types object */
export type EIP712Types = Record<string, EIP712TypeDefinition[]>;

// ============================================================================
// FacilitatorEvmSigner Interface (from @x402/evm)
// ============================================================================

/** Arguments for getCode method */
export interface GetCodeArgs {
  address: Address;
}

/** Arguments for readContract method */
export interface ReadContractArgs {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}

/** Arguments for verifyTypedData method */
export interface VerifyTypedDataArgs {
  address: Address;
  domain: Record<string, unknown>;
  types: Record<string, unknown>;
  primaryType: string;
  message: Record<string, unknown>;
  signature: Hex;
}

/** Arguments for writeContract method */
export interface WriteContractArgs {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
}

/** Arguments for sendTransaction method */
export interface SendTransactionArgs {
  to: Address;
  data: Hex;
  value?: bigint;
}

/** Arguments for waitForTransactionReceipt method */
export interface WaitForTransactionReceiptArgs {
  hash: TransactionHash;
  timeout?: number;
}

/** Transaction receipt result */
export interface TransactionReceiptResult {
  status: "success" | "reverted";
  blockNumber?: bigint;
  gasUsed?: bigint;
  transactionHash: TransactionHash;
}

/**
 * FacilitatorEvmSigner Interface
 *
 * This interface must be implemented to create an X402 facilitator.
 * Based on @x402/evm FacilitatorEvmSigner.
 */
export interface FacilitatorEvmSigner {
  /** Get all addresses this facilitator can use for signing */
  getAddresses(): Address[];

  /** Get bytecode at an address */
  getCode(args: GetCodeArgs): Promise<Hex | undefined>;

  /** Read contract state */
  readContract(args: ReadContractArgs): Promise<unknown>;

  /** Verify an EIP-712 typed data signature */
  verifyTypedData(args: VerifyTypedDataArgs): Promise<boolean>;

  /** Write to a contract (state-changing transaction) */
  writeContract(args: WriteContractArgs): Promise<TransactionHash>;

  /** Send a raw transaction */
  sendTransaction(args: SendTransactionArgs): Promise<TransactionHash>;

  /** Wait for a transaction to be mined */
  waitForTransactionReceipt(
    args: WaitForTransactionReceiptArgs
  ): Promise<TransactionReceiptResult>;
}

// ============================================================================
// Facilitator Configuration
// ============================================================================

export interface PlasmaFacilitatorConfig {
  /** Private key for signing transactions */
  privateKey: Hex;
  /** RPC URL (defaults to Plasma mainnet) */
  rpcUrl?: string;
  /** Chain configuration (defaults to Plasma mainnet) */
  chain?: PlasmaChainConfig;
  /** Transaction timeout in ms (default: 60000) */
  transactionTimeout?: number;
  /** Number of confirmations to wait for (default: 1) */
  confirmations?: number;
}

// ============================================================================
// X402 Payment Types
// ============================================================================

/** X402 Payment scheme identifier */
export type X402Scheme =
  | "eip3009-transfer-with-auth"
  | "erc20-gasless-router"
  | "eip3009-receive";

/** X402 Payment payload */
export interface X402PaymentPayload {
  scheme: X402Scheme;
  payload: {
    from: Address;
    to: Address;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: Hex;
    signature: Hex;
  };
}

/** X402 Payment header */
export interface X402PaymentHeader {
  "X-Payment": string;
}

/** X402 Payment result */
export interface X402PaymentResult {
  success: boolean;
  transactionHash?: TransactionHash;
  error?: string;
}

// ============================================================================
// USDT0 Contract ABI (EIP-3009)
// ============================================================================

export const USDT0_ABI = [
  // ERC-20 Standard
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",

  // EIP-3009 TransferWithAuthorization
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function cancelAuthorization(address authorizer, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",

  // EIP-712 Domain
  "function DOMAIN_SEPARATOR() view returns (bytes32)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)",
  "event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce)",
] as const;

// ============================================================================
// EIP-712 Type Hashes for EIP-3009
// ============================================================================

export const TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
  "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)";

export const RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
  "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)";

export const CANCEL_AUTHORIZATION_TYPEHASH =
  "CancelAuthorization(address authorizer,bytes32 nonce)";
