/**
 * Cryptographic utilities for signature handling
 */

/**
 * Split an Ethereum signature into v, r, s components
 * Used for EIP-3009 transferWithAuthorization
 */
export function splitSignature(signature: `0x${string}`): { 
  v: number; 
  r: `0x${string}`; 
  s: `0x${string}` 
} {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

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
