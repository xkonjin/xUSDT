import type { Hex } from 'viem';

interface ValidationResult {
  valid: boolean;
  key: string;
  error?: string;
}

/**
 * Validates and normalizes a private key
 * - Trims whitespace and newlines
 * - Validates it's 64 hex chars (or 66 with 0x prefix)
 * - Adds 0x prefix if missing
 */
export function validatePrivateKey(key: string | undefined): ValidationResult {
  if (!key) {
    return { valid: false, key: '', error: 'Private key is not set' };
  }

  // Trim whitespace and newlines
  const trimmed = key.trim().replace(/[\r\n]/g, '');
  
  // Check if it has 0x prefix
  const hasPrefix = trimmed.startsWith('0x');
  const hexPart = hasPrefix ? trimmed.slice(2) : trimmed;
  
  // Validate hex characters
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    return { 
      valid: false, 
      key: '', 
      error: 'Private key contains invalid characters (must be hex)' 
    };
  }
  
  // Validate length (32 bytes = 64 hex chars)
  if (hexPart.length !== 64) {
    return { 
      valid: false, 
      key: '', 
      error: `Private key must be 32 bytes (64 hex chars), got ${hexPart.length}` 
    };
  }
  
  // Return normalized key with 0x prefix
  return { valid: true, key: `0x${hexPart}` };
}

/**
 * Normalizes a private key by adding 0x prefix if missing
 * Returns the key as Hex type for viem compatibility
 */
export function normalizePrivateKey(key: string | undefined): Hex | null {
  const result = validatePrivateKey(key);
  if (!result.valid) {
    return null;
  }
  return result.key as Hex;
}

/**
 * Gets validated relayer private key from env
 * Logs error details server-side but returns user-friendly message
 */
export function getValidatedRelayerKey(): { key: Hex | null; error?: string } {
  const result = validatePrivateKey(process.env.RELAYER_PRIVATE_KEY);
  
  if (!result.valid) {
    console.error('[validation] RELAYER_PRIVATE_KEY validation failed:', result.error);
    return { 
      key: null, 
      error: 'Payment service configuration error. Please contact support.' 
    };
  }
  
  return { key: result.key as Hex };
}

/**
 * Validates an Ethereum address
 */
export function validateAddress(address: string | undefined): ValidationResult {
  if (!address) {
    return { valid: false, key: '', error: 'Address is not set' };
  }

  const trimmed = address.trim();
  
  // Check 0x prefix
  if (!trimmed.startsWith('0x')) {
    return { valid: false, key: '', error: 'Address must start with 0x' };
  }
  
  const hexPart = trimmed.slice(2);
  
  // Validate hex characters
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    return { 
      valid: false, 
      key: '', 
      error: 'Address contains invalid characters' 
    };
  }
  
  // Validate length (20 bytes = 40 hex chars)
  if (hexPart.length !== 40) {
    return { 
      valid: false, 
      key: '', 
      error: `Address must be 20 bytes (40 hex chars), got ${hexPart.length}` 
    };
  }
  
  return { valid: true, key: trimmed };
}

/**
 * Log startup warnings for missing optional env vars
 */
export function logStartupWarnings(): void {
  const warnings: string[] = [];
  
  if (!process.env.NEXT_PUBLIC_MERCHANT_ADDRESS) {
    warnings.push('NEXT_PUBLIC_MERCHANT_ADDRESS not set - claim links will be unavailable');
  }
  
  if (!process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY not set - email notifications will be logged to console');
  }
  
  if (!process.env.NEXT_PUBLIC_TRANSAK_API_KEY) {
    warnings.push('NEXT_PUBLIC_TRANSAK_API_KEY not set - Transak on-ramp will be unavailable');
  }
  
  const relayerResult = validatePrivateKey(process.env.RELAYER_PRIVATE_KEY);
  if (!relayerResult.valid) {
    warnings.push(`RELAYER_PRIVATE_KEY invalid: ${relayerResult.error}`);
  }
  
  if (warnings.length > 0) {
    console.warn('[startup] Configuration warnings:');
    warnings.forEach(w => console.warn(`  - ${w}`));
  }
}
