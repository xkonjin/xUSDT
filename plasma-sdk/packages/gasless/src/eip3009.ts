/**
 * EIP-3009: Transfer With Authorization
 * 
 * Implements gasless token transfers via signed authorizations
 */

import type { Address, Hex } from 'viem';
import {
  USDT0_ADDRESS,
  USDT0_EIP712_DOMAIN,
  PLASMA_MAINNET_CHAIN_ID,
  type TransferWithAuthorizationParams,
  type EIP3009TypedData,
  generateNonce,
  getValidityWindow,
} from '@plasma-pay/core';

/**
 * EIP-3009 TransferWithAuthorization type definition for EIP-712
 */
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

/**
 * Build EIP-712 typed data for TransferWithAuthorization
 */
export function buildTransferAuthorizationTypedData(
  params: TransferWithAuthorizationParams,
  options: {
    chainId?: number;
    tokenAddress?: Address;
    tokenName?: string;
    tokenVersion?: string;
  } = {}
): EIP3009TypedData {
  const {
    chainId = PLASMA_MAINNET_CHAIN_ID,
    tokenAddress = USDT0_ADDRESS,
    tokenName = USDT0_EIP712_DOMAIN.name,
    tokenVersion = USDT0_EIP712_DOMAIN.version,
  } = options;

  return {
    domain: {
      name: tokenName,
      version: tokenVersion,
      chainId,
      verifyingContract: tokenAddress,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: params.from,
      to: params.to,
      value: params.value.toString(),
      validAfter: params.validAfter.toString(),
      validBefore: params.validBefore.toString(),
      nonce: params.nonce,
    },
  };
}

/**
 * Create transfer authorization parameters with defaults
 */
export function createTransferParams(
  from: Address,
  to: Address,
  value: bigint,
  options: {
    validAfter?: number;
    validBefore?: number;
    nonce?: Hex;
    validityPeriod?: number;
  } = {}
): TransferWithAuthorizationParams {
  const { validAfter, validBefore } = options.validAfter !== undefined && options.validBefore !== undefined
    ? { validAfter: options.validAfter, validBefore: options.validBefore }
    : getValidityWindow(options.validityPeriod);

  return {
    from,
    to,
    value,
    validAfter,
    validBefore,
    nonce: options.nonce ?? generateNonce(),
  };
}

/**
 * Validate transfer authorization parameters
 */
export function validateTransferParams(params: TransferWithAuthorizationParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const now = Math.floor(Date.now() / 1000);

  if (!params.from || params.from === '0x0000000000000000000000000000000000000000') {
    errors.push('Invalid from address');
  }

  if (!params.to || params.to === '0x0000000000000000000000000000000000000000') {
    errors.push('Invalid to address');
  }

  if (params.from === params.to) {
    errors.push('From and to addresses cannot be the same');
  }

  if (params.value <= 0n) {
    errors.push('Value must be greater than 0');
  }

  if (params.validBefore <= params.validAfter) {
    errors.push('validBefore must be greater than validAfter');
  }

  if (now < params.validAfter) {
    errors.push('Authorization is not yet valid');
  }

  if (now > params.validBefore) {
    errors.push('Authorization has expired');
  }

  if (!params.nonce || !/^0x[a-fA-F0-9]{64}$/.test(params.nonce)) {
    errors.push('Invalid nonce format (must be bytes32)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate time until authorization expires
 */
export function getTimeUntilExpiry(validBefore: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, validBefore - now);
}

/**
 * Check if authorization is currently valid
 */
export function isAuthorizationValid(params: TransferWithAuthorizationParams): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= params.validAfter && now < params.validBefore;
}
