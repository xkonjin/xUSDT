/**
 * Secure Validation Utilities
 * 
 * Provides input validation with secure error handling that does not
 * leak sensitive information in logs or error messages.
 * 
 * CRITICAL: Replaces validation functions that exposed sensitive details in errors.
 */

import type { Address, Hex } from 'viem';
import { isAddress, isHex } from 'viem';

// =============================================================================
// Types
// =============================================================================

export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  /** Generic error code for logging (no sensitive details) */
  errorCode?: string;
  /** User-facing error message (sanitized) */
  userMessage?: string;
}

export interface PrivateKeyValidationResult {
  valid: boolean;
  /** Sanitized key (only for internal use, never log) */
  key?: Hex;
  /** Generic error code */
  errorCode?: string;
}

// =============================================================================
// Error Codes (Safe to Log)
// =============================================================================

export const ValidationErrorCodes = {
  MISSING_VALUE: 'MISSING_VALUE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_PREFIX: 'INVALID_PREFIX',
  INVALID_CHECKSUM: 'INVALID_CHECKSUM',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  EXPIRED: 'EXPIRED',
  NOT_YET_VALID: 'NOT_YET_VALID',
  ZERO_VALUE: 'ZERO_VALUE',
  SELF_TRANSFER: 'SELF_TRANSFER',
} as const;

// =============================================================================
// Private Key Validation (Secure)
// =============================================================================

/**
 * Validate a private key without exposing details in errors.
 * 
 * SECURITY: Never log the key or specific validation failure details.
 */
export function validatePrivateKey(key: string | undefined): PrivateKeyValidationResult {
  // Check if key exists
  if (!key) {
    // DO NOT log what's missing
    console.error('[validation] Key validation failed: MISSING_VALUE');
    return { valid: false, errorCode: ValidationErrorCodes.MISSING_VALUE };
  }

  // Normalize key
  let normalizedKey = key.trim();
  
  // Add 0x prefix if missing
  if (!normalizedKey.startsWith('0x')) {
    normalizedKey = `0x${normalizedKey}`;
  }

  // Check format (64 hex chars + 0x prefix = 66 chars)
  if (normalizedKey.length !== 66) {
    // DO NOT log the actual length or key
    console.error('[validation] Key validation failed: INVALID_LENGTH');
    return { valid: false, errorCode: ValidationErrorCodes.INVALID_LENGTH };
  }

  // Check if valid hex
  if (!isHex(normalizedKey)) {
    // DO NOT log what characters are invalid
    console.error('[validation] Key validation failed: INVALID_FORMAT');
    return { valid: false, errorCode: ValidationErrorCodes.INVALID_FORMAT };
  }

  // Check for obviously weak keys (all zeros, all ones, etc.)
  const keyWithoutPrefix = normalizedKey.slice(2);
  if (/^(.)\1+$/.test(keyWithoutPrefix)) {
    // DO NOT log the pattern
    console.error('[validation] Key validation failed: INVALID_FORMAT');
    return { valid: false, errorCode: ValidationErrorCodes.INVALID_FORMAT };
  }

  return { valid: true, key: normalizedKey as Hex };
}

/**
 * Get validated relayer key from environment.
 * Returns sanitized result without exposing key details.
 */
export function getValidatedRelayerKey(): { key: Hex | null; error: string | null } {
  const envKey = process.env.RELAYER_PRIVATE_KEY;
  
  const result = validatePrivateKey(envKey);
  
  if (!result.valid) {
    // Return generic error message
    return {
      key: null,
      error: 'Relayer configuration error. Please contact support.',
    };
  }

  return { key: result.key!, error: null };
}

// =============================================================================
// Address Validation
// =============================================================================

/**
 * Validate an Ethereum address.
 */
export function validateAddress(address: string | undefined): ValidationResult<Address> {
  if (!address) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.MISSING_VALUE,
      userMessage: 'Address is required',
    };
  }

  const trimmed = address.trim();

  if (!isAddress(trimmed)) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid address format',
    };
  }

  // Check for zero address
  if (trimmed === '0x0000000000000000000000000000000000000000') {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.ZERO_VALUE,
      userMessage: 'Zero address is not allowed',
    };
  }

  return { valid: true, value: trimmed as Address };
}

// =============================================================================
// Amount Validation
// =============================================================================

export interface AmountValidationOptions {
  minAmount?: bigint;
  maxAmount?: bigint;
  decimals?: number;
}

/**
 * Validate a payment amount.
 */
export function validateAmount(
  amount: string | bigint | undefined,
  options: AmountValidationOptions = {}
): ValidationResult<bigint> {
  const { minAmount = 0n, maxAmount = BigInt(10 ** 18), decimals = 6 } = options;

  if (amount === undefined || amount === null || amount === '') {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.MISSING_VALUE,
      userMessage: 'Amount is required',
    };
  }

  let amountBigInt: bigint;
  
  try {
    amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount);
  } catch {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid amount format',
    };
  }

  if (amountBigInt <= 0n) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.ZERO_VALUE,
      userMessage: 'Amount must be greater than zero',
    };
  }

  if (amountBigInt < minAmount) {
    const minFormatted = formatAmount(minAmount, decimals);
    return {
      valid: false,
      errorCode: ValidationErrorCodes.OUT_OF_RANGE,
      userMessage: `Amount must be at least $${minFormatted}`,
    };
  }

  if (amountBigInt > maxAmount) {
    const maxFormatted = formatAmount(maxAmount, decimals);
    return {
      valid: false,
      errorCode: ValidationErrorCodes.OUT_OF_RANGE,
      userMessage: `Amount cannot exceed $${maxFormatted}`,
    };
  }

  return { valid: true, value: amountBigInt };
}

function formatAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === 0n) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

// =============================================================================
// Authorization Validation
// =============================================================================

export interface AuthorizationParams {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
}

/**
 * Validate transfer authorization parameters.
 */
export function validateAuthorization(params: Partial<AuthorizationParams>): ValidationResult<AuthorizationParams> {
  const errors: string[] = [];

  // Validate from address
  const fromResult = validateAddress(params.from);
  if (!fromResult.valid) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid sender address',
    };
  }

  // Validate to address
  const toResult = validateAddress(params.to);
  if (!toResult.valid) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid recipient address',
    };
  }

  // Check for self-transfer
  if (fromResult.value!.toLowerCase() === toResult.value!.toLowerCase()) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.SELF_TRANSFER,
      userMessage: 'Cannot transfer to yourself',
    };
  }

  // Validate value
  if (params.value === undefined || params.value <= 0n) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.ZERO_VALUE,
      userMessage: 'Amount must be greater than zero',
    };
  }

  // Validate timestamps
  const now = Math.floor(Date.now() / 1000);

  if (params.validAfter === undefined || params.validBefore === undefined) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.MISSING_VALUE,
      userMessage: 'Authorization timestamps are required',
    };
  }

  if (now < params.validAfter) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.NOT_YET_VALID,
      userMessage: 'Authorization is not yet valid',
    };
  }

  if (now > params.validBefore) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.EXPIRED,
      userMessage: 'Authorization has expired',
    };
  }

  // Validate nonce format
  if (!params.nonce || !/^0x[a-fA-F0-9]{64}$/.test(params.nonce)) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid authorization nonce',
    };
  }

  return {
    valid: true,
    value: {
      from: fromResult.value!,
      to: toResult.value!,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    },
  };
}

// =============================================================================
// Email/Phone Validation
// =============================================================================

/**
 * Validate email address format.
 */
export function validateEmail(email: string | undefined): ValidationResult<string> {
  if (!email) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.MISSING_VALUE,
      userMessage: 'Email is required',
    };
  }

  const trimmed = email.trim().toLowerCase();
  
  // Basic email regex (not perfect but catches most issues)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid email format',
    };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate phone number format.
 */
export function validatePhone(phone: string | undefined): ValidationResult<string> {
  if (!phone) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.MISSING_VALUE,
      userMessage: 'Phone number is required',
    };
  }

  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check length (international numbers are typically 10-15 digits)
  if (cleaned.length < 10 || cleaned.length > 16) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_LENGTH,
      userMessage: 'Invalid phone number length',
    };
  }

  return { valid: true, value: cleaned };
}

// =============================================================================
// Signature Validation
// =============================================================================

/**
 * Validate signature components (v, r, s).
 */
export function validateSignature(v: number | undefined, r: string | undefined, s: string | undefined): ValidationResult<{ v: number; r: Hex; s: Hex }> {
  if (v === undefined || !r || !s) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.MISSING_VALUE,
      userMessage: 'Signature is incomplete',
    };
  }

  // Validate v (should be 27 or 28, or 0/1 for EIP-155)
  if (![0, 1, 27, 28].includes(v)) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid signature',
    };
  }

  // Validate r and s are valid hex
  if (!isHex(r) || !isHex(s)) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_FORMAT,
      userMessage: 'Invalid signature format',
    };
  }

  // Validate r and s are 32 bytes
  if (r.length !== 66 || s.length !== 66) {
    return {
      valid: false,
      errorCode: ValidationErrorCodes.INVALID_LENGTH,
      userMessage: 'Invalid signature length',
    };
  }

  return {
    valid: true,
    value: { v, r: r as Hex, s: s as Hex },
  };
}
