/**
 * Cryptographic utilities for signature handling
 */

// Re-export splitSignature from @plasma-pay/core to avoid duplication
export { splitSignature } from '@plasma-pay/core';

/**
 * Validate an Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
