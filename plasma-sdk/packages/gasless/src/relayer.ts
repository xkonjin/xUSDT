/**
 * Gasless Relayer Client
 * 
 * Submits signed authorizations to a relayer service for execution.
 * 
 * PLASMA GASLESS API (FREE TRANSACTIONS)
 * ======================================
 * The Plasma gasless relayer at https://api.plasma.to enables FREE transactions
 * where Plasma pays gas instead of the user or a backend relayer wallet.
 * 
 * Rate Limits (per Plasma API docs):
 * - 10 transfers per day per address
 * - 10,000 USDT0 daily volume per address
 * - 20 transfers per day per IP
 * - Minimum transfer: 1 USDT0
 * - Resets at 00:00 UTC
 * 
 * Usage:
 * - Call your backend /api/relay endpoint which forwards to api.plasma.to
 * - Backend adds X-Internal-Secret header (never expose in client code!)
 * - Backend forwards X-User-IP for rate limiting
 */

import type { Address, Hex, PublicClient, WalletClient, Hash } from 'viem';
import { createPublicClient, http, encodeFunctionData } from 'viem';
import {
  USDT0_ADDRESS,
  PLASMA_MAINNET_RPC,
  PLASMA_MAINNET_CHAIN_ID,
  type SignedTransferAuthorization,
  retry,
} from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';

// =============================================================================
// Plasma Gasless API Configuration
// =============================================================================
// The official Plasma gasless relayer API URL. This API enables FREE transactions
// where Plasma covers the gas cost. Authentication requires X-Internal-Secret
// header which should only be used server-side (never expose in client code).
// =============================================================================
export const PLASMA_GASLESS_API = 'https://api.plasma.to';

// Rate limit constants for UI feedback
export const PLASMA_GASLESS_LIMITS = {
  /** Maximum transfers per address per day */
  DAILY_TRANSFERS_PER_ADDRESS: 10,
  /** Maximum USDT0 volume per address per day (in atomic units, 6 decimals) */
  DAILY_VOLUME_PER_ADDRESS: 10_000_000_000n, // 10,000 USDT0
  /** Maximum transfers per IP per day */
  DAILY_TRANSFERS_PER_IP: 20,
  /** Minimum transfer amount in atomic units */
  MINIMUM_AMOUNT: 1_000_000n, // 1 USDT0
} as const;

/**
 * ABI for transferWithAuthorization function
 */
const TRANSFER_WITH_AUTHORIZATION_ABI = [
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export interface RelayerConfig {
  relayerUrl?: string;
  tokenAddress?: Address;
  chainId?: number;
  rpcUrl?: string;
  maxRetries?: number;
}

export interface RelayResult {
  success: boolean;
  txHash?: Hash;
  error?: string;
  receipt?: {
    blockNumber: bigint;
    status: 'success' | 'reverted';
    gasUsed: bigint;
  };
}

/**
 * Submit a signed authorization to a relayer service
 */
export async function submitToRelayer(
  authorization: SignedTransferAuthorization,
  config: RelayerConfig = {}
): Promise<RelayResult> {
  const {
    relayerUrl,
    tokenAddress = USDT0_ADDRESS,
    maxRetries = 3,
  } = config;

  if (!relayerUrl) {
    throw new Error('relayerUrl is required');
  }

  try {
    const response = await retry(
      async () => {
        const res = await fetch(`${relayerUrl}/relay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenAddress,
            authorization: {
              from: authorization.from,
              to: authorization.to,
              value: authorization.value.toString(),
              validAfter: authorization.validAfter,
              validBefore: authorization.validBefore,
              nonce: authorization.nonce,
              v: authorization.v,
              r: authorization.r,
              s: authorization.s,
            },
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Relayer error: ${error}`);
        }

        return res.json();
      },
      maxRetries
    );

    return {
      success: true,
      txHash: response.txHash,
      receipt: response.receipt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute transfer authorization directly on-chain
 * (Requires a wallet client with gas)
 */
export async function executeOnChain(
  walletClient: WalletClient,
  authorization: SignedTransferAuthorization,
  config: RelayerConfig = {}
): Promise<RelayResult> {
  const { tokenAddress = USDT0_ADDRESS, rpcUrl = PLASMA_MAINNET_RPC } = config;

  try {
    const publicClient = createPublicClient({
      chain: plasmaMainnet,
      transport: http(rpcUrl),
    });

    // Encode function call
    const data = encodeFunctionData({
      abi: TRANSFER_WITH_AUTHORIZATION_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        authorization.from,
        authorization.to,
        authorization.value,
        BigInt(authorization.validAfter),
        BigInt(authorization.validBefore),
        authorization.nonce,
        authorization.v,
        authorization.r,
        authorization.s,
      ],
    });

    // Send transaction
    const hash = await walletClient.sendTransaction({
      to: tokenAddress,
      data,
      chain: plasmaMainnet,
      account: walletClient.account!,
    });

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: receipt.status === 'success',
      txHash: hash,
      receipt: {
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        gasUsed: receipt.gasUsed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a relayer client
 */
export function createRelayerClient(config: RelayerConfig = {}) {
  return {
    /**
     * Submit a signed authorization to the relayer
     */
    submit: (authorization: SignedTransferAuthorization) =>
      submitToRelayer(authorization, config),

    /**
     * Check the status of a transaction
     */
    getStatus: async (txHash: Hash): Promise<{
      status: 'pending' | 'confirmed' | 'failed';
      blockNumber?: bigint;
    }> => {
      const { rpcUrl = PLASMA_MAINNET_RPC } = config;
      const publicClient = createPublicClient({
        chain: plasmaMainnet,
        transport: http(rpcUrl),
      });

      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        return {
          status: receipt.status === 'success' ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber,
        };
      } catch {
        return { status: 'pending' };
      }
    },

    /**
     * Wait for a transaction to be confirmed
     */
    waitForConfirmation: async (
      txHash: Hash,
      confirmations: number = 1
    ): Promise<RelayResult> => {
      const { rpcUrl = PLASMA_MAINNET_RPC } = config;
      const publicClient = createPublicClient({
        chain: plasmaMainnet,
        transport: http(rpcUrl),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations,
      });

      return {
        success: receipt.status === 'success',
        txHash,
        receipt: {
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          gasUsed: receipt.gasUsed,
        },
      };
    },
  };
}

/**
 * Estimate gas for a transfer authorization
 */
export async function estimateGas(
  authorization: SignedTransferAuthorization,
  config: RelayerConfig = {}
): Promise<bigint> {
  const { tokenAddress = USDT0_ADDRESS, rpcUrl = PLASMA_MAINNET_RPC } = config;

  const publicClient = createPublicClient({
    chain: plasmaMainnet,
    transport: http(rpcUrl),
  });

  const data = encodeFunctionData({
    abi: TRANSFER_WITH_AUTHORIZATION_ABI,
    functionName: 'transferWithAuthorization',
    args: [
      authorization.from,
      authorization.to,
      authorization.value,
      BigInt(authorization.validAfter),
      BigInt(authorization.validBefore),
      authorization.nonce,
      authorization.v,
      authorization.r,
      authorization.s,
    ],
  });

  return publicClient.estimateGas({
    to: tokenAddress,
    data,
  });
}
