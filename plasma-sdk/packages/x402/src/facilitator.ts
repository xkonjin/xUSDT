/**
 * X402 Payment Facilitator
 * 
 * Handles payment verification and settlement on-chain
 */

import type { Address, Hex, Hash, PublicClient } from 'viem';
import { createPublicClient, http, verifyTypedData, encodeFunctionData } from 'viem';
import {
  USDT0_ADDRESS,
  PLASMA_MAINNET_RPC,
  PLASMA_MAINNET_CHAIN_ID,
  USDT0_EIP712_DOMAIN,
} from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';
import { TRANSFER_WITH_AUTHORIZATION_TYPES } from '@plasma-pay/gasless';
import type {
  X402PaymentSubmitted,
  VerificationResult,
  SettlementResult,
} from './types';

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
  {
    inputs: [{ name: 'authorizer', type: 'address' }, { name: 'nonce', type: 'bytes32' }],
    name: 'authorizationState',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface FacilitatorConfig {
  rpcUrl?: string;
  chainId?: number;
  tokenAddress?: Address;
  tokenName?: string;
  tokenVersion?: string;
  /** Private key for executing settlements (if not using relayer) */
  executorKey?: Hex;
  /** URL of a relayer service */
  relayerUrl?: string;
}

/**
 * Verify a payment authorization signature
 */
export async function verifyPayment(
  payment: X402PaymentSubmitted,
  config: FacilitatorConfig = {}
): Promise<VerificationResult> {
  const {
    chainId = PLASMA_MAINNET_CHAIN_ID,
    tokenAddress = USDT0_ADDRESS,
    tokenName = USDT0_EIP712_DOMAIN.name,
    tokenVersion = USDT0_EIP712_DOMAIN.version,
  } = config;

  try {
    const { authorization, chosenOption } = payment;
    
    // Check basic validity
    const now = Math.floor(Date.now() / 1000);
    
    if (now < authorization.validAfter) {
      return { valid: false, error: 'Authorization not yet valid' };
    }
    
    if (now > authorization.validBefore) {
      return { valid: false, error: 'Authorization expired' };
    }
    
    // Check amount matches
    if (BigInt(authorization.value) < BigInt(chosenOption.amount)) {
      return { valid: false, error: 'Authorization amount insufficient' };
    }
    
    // Check recipient matches
    if (authorization.to.toLowerCase() !== chosenOption.recipient.toLowerCase()) {
      return { valid: false, error: 'Authorization recipient mismatch' };
    }

    // Verify signature
    const domain = {
      name: tokenName,
      version: tokenVersion,
      chainId,
      verifyingContract: tokenAddress,
    };

    const message = {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce,
    };

    // Reconstruct signature from v, r, s
    const signature = `${authorization.r}${authorization.s.slice(2)}${authorization.v.toString(16).padStart(2, '0')}` as Hex;

    const valid = await verifyTypedData({
      address: authorization.from,
      domain,
      types: TRANSFER_WITH_AUTHORIZATION_TYPES,
      primaryType: 'TransferWithAuthorization',
      message,
      signature,
    });

    if (!valid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return {
      valid: true,
      details: {
        from: authorization.from,
        to: authorization.to,
        value: authorization.value,
        nonce: authorization.nonce,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Check if a nonce has already been used
 */
export async function isNonceUsed(
  from: Address,
  nonce: Hex,
  config: FacilitatorConfig = {}
): Promise<boolean> {
  const {
    rpcUrl = PLASMA_MAINNET_RPC,
    tokenAddress = USDT0_ADDRESS,
  } = config;

  const publicClient = createPublicClient({
    chain: plasmaMainnet,
    transport: http(rpcUrl),
  });

  try {
    const used = await publicClient.readContract({
      address: tokenAddress,
      abi: TRANSFER_WITH_AUTHORIZATION_ABI,
      functionName: 'authorizationState',
      args: [from, nonce],
    });
    return used;
  } catch {
    // If the function doesn't exist, assume nonce tracking is off-chain
    return false;
  }
}

/**
 * Settle a payment by executing the authorization on-chain
 */
export async function settlePayment(
  payment: X402PaymentSubmitted,
  config: FacilitatorConfig = {}
): Promise<SettlementResult> {
  const {
    relayerUrl,
    tokenAddress = USDT0_ADDRESS,
    rpcUrl = PLASMA_MAINNET_RPC,
  } = config;

  try {
    const { authorization } = payment;

    // Check if nonce already used
    const nonceUsed = await isNonceUsed(authorization.from, authorization.nonce, config);
    if (nonceUsed) {
      return { success: false, error: 'Nonce already used' };
    }

    // If relayer URL is provided, use the relayer service
    if (relayerUrl) {
      return settleViaRelayer(payment, relayerUrl, tokenAddress);
    }

    // Otherwise, we need an executor key to settle directly
    if (!config.executorKey) {
      return { success: false, error: 'No executor key or relayer URL provided' };
    }

    return settleDirectly(payment, config);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Settlement failed',
    };
  }
}

/**
 * Settle payment via a relayer service
 */
async function settleViaRelayer(
  payment: X402PaymentSubmitted,
  relayerUrl: string,
  tokenAddress: Address
): Promise<SettlementResult> {
  const response = await fetch(`${relayerUrl}/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenAddress,
      authorization: payment.authorization,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Relayer error: ${error}` };
  }

  const result = await response.json();
  return {
    success: true,
    txHash: result.txHash,
    blockNumber: result.blockNumber ? BigInt(result.blockNumber) : undefined,
    status: result.status || 'pending',
  };
}

/**
 * Settle payment directly on-chain (requires executor key)
 */
async function settleDirectly(
  payment: X402PaymentSubmitted,
  config: FacilitatorConfig
): Promise<SettlementResult> {
  const { privateKeyToAccount } = await import('viem/accounts');
  const { createWalletClient } = await import('viem');
  
  const {
    executorKey,
    tokenAddress = USDT0_ADDRESS,
    rpcUrl = PLASMA_MAINNET_RPC,
  } = config;

  if (!executorKey) {
    return { success: false, error: 'Executor key required for direct settlement' };
  }

  const account = privateKeyToAccount(executorKey);
  
  const walletClient = createWalletClient({
    account,
    chain: plasmaMainnet,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: plasmaMainnet,
    transport: http(rpcUrl),
  });

  const { authorization } = payment;

  // Execute the transfer
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: TRANSFER_WITH_AUTHORIZATION_ABI,
    functionName: 'transferWithAuthorization',
    args: [
      authorization.from,
      authorization.to,
      BigInt(authorization.value),
      BigInt(authorization.validAfter),
      BigInt(authorization.validBefore),
      authorization.nonce,
      authorization.v,
      authorization.r as Hex,
      authorization.s as Hex,
    ],
  });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    success: receipt.status === 'success',
    txHash: hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status === 'success' ? 'confirmed' : 'failed',
  };
}

/**
 * Combined verify and settle
 */
export async function verifyAndSettle(
  payment: X402PaymentSubmitted,
  config: FacilitatorConfig = {}
): Promise<SettlementResult> {
  // First verify the payment
  const verification = await verifyPayment(payment, config);
  
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  // Then settle
  return settlePayment(payment, config);
}

/**
 * Create a facilitator instance
 */
export function createFacilitator(config: FacilitatorConfig = {}) {
  return {
    verify: (payment: X402PaymentSubmitted) => verifyPayment(payment, config),
    settle: (payment: X402PaymentSubmitted) => settlePayment(payment, config),
    verifyAndSettle: (payment: X402PaymentSubmitted) => verifyAndSettle(payment, config),
    isNonceUsed: (from: Address, nonce: Hex) => isNonceUsed(from, nonce, config),
  };
}
