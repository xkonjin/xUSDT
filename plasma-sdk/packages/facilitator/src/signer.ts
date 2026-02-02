/**
 * @plasma-pay/facilitator - EIP-3009 Authorization Signer
 * 
 * Client-side utilities for signing EIP-3009 TransferWithAuthorization.
 */

import { ethers, Wallet, randomBytes, hexlify } from 'ethers';
import {
  Address,
  Hex,
  TransferWithAuthorizationParams,
  SignedAuthorization,
  EIP712Domain,
  PLASMA_MAINNET,
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
} from './types';

// ============================================================================
// EIP-712 Types for EIP-3009
// ============================================================================

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

// ============================================================================
// Authorization Signer
// ============================================================================

export interface AuthorizationSignerConfig {
  /** Private key for signing */
  privateKey: Hex;
  /** USDT0 contract address (defaults to Plasma mainnet) */
  tokenAddress?: Address;
  /** Chain ID (defaults to Plasma mainnet) */
  chainId?: number;
  /** Token name for EIP-712 domain (defaults to 'USD₮0') */
  tokenName?: string;
  /** Token version for EIP-712 domain (defaults to '1') */
  tokenVersion?: string;
}

/**
 * AuthorizationSigner - Signs EIP-3009 TransferWithAuthorization
 * 
 * @example
 * ```typescript
 * const signer = new AuthorizationSigner({
 *   privateKey: '0x...',
 * });
 * 
 * const auth = await signer.signTransferAuthorization({
 *   to: '0x...',
 *   value: 1000000n, // 1 USDT0
 *   validityDuration: 3600, // 1 hour
 * });
 * 
 * // Use auth in X-Payment header
 * const header = { 'X-Payment': JSON.stringify(auth) };
 * ```
 */
export class AuthorizationSigner {
  private readonly wallet: Wallet;
  private readonly domain: EIP712Domain;

  constructor(config: AuthorizationSignerConfig) {
    this.wallet = new Wallet(config.privateKey);
    
    this.domain = {
      name: config.tokenName || 'USD₮0',
      version: config.tokenVersion || '1',
      chainId: config.chainId || PLASMA_MAINNET.chainId,
      verifyingContract: config.tokenAddress || PLASMA_MAINNET.usdt0Address,
    };
  }

  /**
   * Get the signer's address.
   */
  get address(): Address {
    return this.wallet.address as Address;
  }

  /**
   * Generate a random nonce (32 bytes).
   */
  generateNonce(): Hex {
    return hexlify(randomBytes(32)) as Hex;
  }

  /**
   * Sign a TransferWithAuthorization.
   * 
   * @param params - Authorization parameters
   * @returns Signed authorization ready for X-Payment header
   */
  async signTransferAuthorization(params: {
    to: Address;
    value: bigint;
    validAfter?: bigint;
    validBefore?: bigint;
    validityDuration?: number;
    nonce?: Hex;
  }): Promise<SignedAuthorization> {
    const now = BigInt(Math.floor(Date.now() / 1000));
    
    // Set validity window
    const validAfter = params.validAfter ?? now;
    const validBefore = params.validBefore ?? 
      (params.validityDuration 
        ? now + BigInt(params.validityDuration)
        : now + BigInt(3600)); // Default 1 hour
    
    // Generate nonce if not provided
    const nonce = params.nonce || this.generateNonce();

    // Create message
    const message = {
      from: this.wallet.address,
      to: params.to,
      value: params.value,
      validAfter,
      validBefore,
      nonce,
    };

    // Sign using EIP-712
    const signature = await this.wallet.signTypedData(
      this.domain,
      TRANSFER_WITH_AUTHORIZATION_TYPES,
      message
    );

    // Parse signature components
    const { r, s, v } = ethers.Signature.from(signature);

    return {
      from: this.wallet.address as Address,
      to: params.to,
      value: params.value,
      validAfter,
      validBefore,
      nonce,
      v,
      r: r as Hex,
      s: s as Hex,
    };
  }

  /**
   * Create an X-Payment header payload.
   */
  async createPaymentHeader(params: {
    to: Address;
    value: bigint;
    validityDuration?: number;
  }): Promise<string> {
    const auth = await this.signTransferAuthorization(params);
    
    return JSON.stringify({
      scheme: 'eip3009-transfer-with-auth',
      payload: {
        from: auth.from,
        to: auth.to,
        value: auth.value.toString(),
        validAfter: auth.validAfter.toString(),
        validBefore: auth.validBefore.toString(),
        nonce: auth.nonce,
        signature: ethers.concat([auth.r, auth.s, ethers.toBeHex(auth.v, 1)]),
      },
    });
  }

  /**
   * Verify a signed authorization (for testing).
   */
  verifyAuthorization(auth: SignedAuthorization): boolean {
    try {
      const message = {
        from: auth.from,
        to: auth.to,
        value: auth.value,
        validAfter: auth.validAfter,
        validBefore: auth.validBefore,
        nonce: auth.nonce,
      };

      const signature = ethers.concat([auth.r, auth.s, ethers.toBeHex(auth.v, 1)]);
      
      const recoveredAddress = ethers.verifyTypedData(
        this.domain,
        TRANSFER_WITH_AUTHORIZATION_TYPES,
        message,
        signature
      );

      return recoveredAddress.toLowerCase() === auth.from.toLowerCase();
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a signature into v, r, s components.
 */
export function parseSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  const sig = ethers.Signature.from(signature);
  return {
    v: sig.v,
    r: sig.r as Hex,
    s: sig.s as Hex,
  };
}

/**
 * Combine v, r, s into a single signature.
 */
export function combineSignature(v: number, r: Hex, s: Hex): Hex {
  return ethers.concat([r, s, ethers.toBeHex(v, 1)]) as Hex;
}

/**
 * Generate a random nonce.
 */
export function generateNonce(): Hex {
  return hexlify(randomBytes(32)) as Hex;
}

/**
 * Get the current Unix timestamp.
 */
export function getCurrentTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

/**
 * Calculate validity window.
 */
export function calculateValidityWindow(durationSeconds: number): {
  validAfter: bigint;
  validBefore: bigint;
} {
  const now = getCurrentTimestamp();
  return {
    validAfter: now,
    validBefore: now + BigInt(durationSeconds),
  };
}
