/**
 * X402 Payment Verification - Verify EIP-3009 payment proofs
 */

import { verifyTypedData, recoverTypedDataAddress } from 'viem';
import type { Address, Hex } from 'viem';
import type { PaymentProof, VerificationResult } from './types';

const PLASMA_CHAIN_ID = 98866;
const USDT0_ADDRESS = '0x0000000000000000000000000000000000000000' as Address; // TODO: Replace with actual

// Used nonces cache to prevent replay attacks (in production, use Redis or database)
const usedNonces = new Set<string>();
const NONCE_CACHE_SIZE = 10000;

// EIP-3009 domain and types
const EIP3009_DOMAIN = {
  name: 'USDT0',
  version: '1',
  chainId: PLASMA_CHAIN_ID,
  verifyingContract: USDT0_ADDRESS as Address,
};

const EIP3009_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

export interface VerifyOptions {
  expectedAddress?: Address;
  expectedAmount?: string;
  checkOnChain?: boolean;
}

/**
 * Verify an X402 payment proof
 */
export async function verifyPayment(
  proofHeader: string,
  options: VerifyOptions = {}
): Promise<VerificationResult> {
  try {
    // Parse the payment proof from header
    const proof = parsePaymentProof(proofHeader);

    // Verify the signature
    const isValid = await verifySignature(proof);
    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check recipient address if specified
    if (options.expectedAddress && proof.to.toLowerCase() !== options.expectedAddress.toLowerCase()) {
      return { valid: false, error: 'Payment to wrong address' };
    }

    // Check amount if specified
    if (options.expectedAmount) {
      const expectedAtomicUnits = parseAmount(options.expectedAmount);
      if (BigInt(proof.value) < BigInt(expectedAtomicUnits)) {
        return { valid: false, error: 'Insufficient payment amount' };
      }
    }

    // Check deadline
    const now = Math.floor(Date.now() / 1000);
    if (parseInt(proof.deadline) < now) {
      return { valid: false, error: 'Payment authorization expired' };
    }
    
    // Check validAfter (not before this time)
    if (proof.validAfter && parseInt(proof.validAfter) > now) {
      return { valid: false, error: 'Payment authorization not yet valid' };
    }
    
    // Replay attack protection - check if nonce was already used
    const nonceKey = `${proof.from}:${proof.nonce}`;
    if (usedNonces.has(nonceKey)) {
      return { valid: false, error: 'Nonce already used (replay attack detected)' };
    }
    
    // Add nonce to cache (with size limit to prevent memory issues)
    if (usedNonces.size >= NONCE_CACHE_SIZE) {
      // Clear oldest entries (simple approach - in production use LRU cache)
      const entries = Array.from(usedNonces);
      for (let i = 0; i < NONCE_CACHE_SIZE / 2; i++) {
        usedNonces.delete(entries[i]);
      }
    }
    usedNonces.add(nonceKey);

    return {
      valid: true,
      payment: {
        from: proof.from,
        to: proof.to,
        amount: proof.value,
        txHash: proof.txHash,
      },
    };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Verification failed' };
  }
}

/**
 * Parse payment proof from header string
 */
function parsePaymentProof(proofHeader: string): PaymentProof {
  // Support both JSON and base64 encoded proofs
  let proofData: any;

  try {
    // Try JSON first
    proofData = JSON.parse(proofHeader);
  } catch {
    // Try base64
    try {
      const decoded = Buffer.from(proofHeader, 'base64').toString('utf-8');
      proofData = JSON.parse(decoded);
    } catch {
      throw new Error('Invalid payment proof format');
    }
  }

  // Validate required fields
  const required = ['signature', 'from', 'to', 'value', 'nonce', 'deadline'];
  
  // Validate address formats
  if (proofData.from && !/^0x[a-fA-F0-9]{40}$/.test(proofData.from)) {
    throw new Error('Invalid from address format');
  }
  if (proofData.to && !/^0x[a-fA-F0-9]{40}$/.test(proofData.to)) {
    throw new Error('Invalid to address format');
  }
  if (proofData.signature && !/^0x[a-fA-F0-9]+$/.test(proofData.signature)) {
    throw new Error('Invalid signature format');
  }
  for (const field of required) {
    if (!proofData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return {
    signature: proofData.signature as Hex,
    from: proofData.from as Address,
    to: proofData.to as Address,
    value: proofData.value.toString(),
    nonce: proofData.nonce.toString(),
    deadline: proofData.deadline.toString(),
    txHash: proofData.txHash as Hex | undefined,
  };
}

/**
 * Verify EIP-3009 signature
 */
async function verifySignature(proof: PaymentProof): Promise<boolean> {
  try {
    const recoveredAddress = await recoverTypedDataAddress({
      domain: EIP3009_DOMAIN,
      types: EIP3009_TYPES,
      primaryType: 'TransferWithAuthorization',
      message: {
        from: proof.from,
        to: proof.to,
        value: BigInt(proof.value),
        validAfter: 0n,
        validBefore: BigInt(proof.deadline),
        nonce: proof.nonce as Hex,
      },
      signature: proof.signature,
    });

    return recoveredAddress.toLowerCase() === proof.from.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Parse amount string to atomic units (6 decimals for USDT0)
 */
function parseAmount(amount: string): string {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(6, '0').slice(0, 6);
  return `${whole}${paddedDecimal}`;
}

/**
 * Format atomic units to human readable amount
 */
export function formatAmount(atomicUnits: string): string {
  const str = atomicUnits.padStart(7, '0');
  const whole = str.slice(0, -6) || '0';
  const decimal = str.slice(-6);
  return `${whole}.${decimal}`;
}

/**
 * Create a payment proof for testing
 */
export function createTestPaymentProof(params: {
  from: Address;
  to: Address;
  amount: string;
  privateKey: Hex;
}): string {
  // This would sign a real EIP-3009 authorization
  // For now, return a placeholder
  const proof: PaymentProof = {
    signature: '0x' as Hex,
    from: params.from,
    to: params.to,
    value: parseAmount(params.amount),
    nonce: `0x${Date.now().toString(16).padStart(64, '0')}`,
    deadline: (Math.floor(Date.now() / 1000) + 3600).toString(),
  };

  return JSON.stringify(proof);
}
