/**
 * Utility Functions for Plasma SDK
 */

import { type Address, type Hex, formatUnits, parseUnits, isAddress, getAddress } from 'viem';
import { USDT0_DECIMALS, DEFAULT_VALIDITY_PERIOD } from './constants';

/**
 * Format USDT0 amount from atomic units to human-readable string
 */
export function formatUSDT0(amount: bigint): string {
  return formatUnits(amount, USDT0_DECIMALS);
}

/**
 * Parse human-readable USDT0 amount to atomic units
 */
export function parseUSDT0(amount: string): bigint {
  return parseUnits(amount, USDT0_DECIMALS);
}

/**
 * Format any token amount with custom decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

/**
 * Parse token amount with custom decimals
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

/**
 * Generate a random nonce for EIP-3009
 */
export function generateNonce(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Calculate validity window for EIP-3009 authorization
 */
export function getValidityWindow(validityPeriod: number = DEFAULT_VALIDITY_PERIOD): {
  validAfter: number;
  validBefore: number;
} {
  const now = getCurrentTimestamp();
  return {
    validAfter: now,
    validBefore: now + validityPeriod,
  };
}

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): address is Address {
  return isAddress(address);
}

/**
 * Normalize address to checksum format
 */
export function normalizeAddress(address: string): Address {
  if (!isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return getAddress(address);
}

/**
 * Shorten address for display (0x1234...5678)
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: bigint, total: bigint): number {
  if (total === 0n) return 0;
  return Number((value * 10000n) / total) / 100;
}

/**
 * Split signature into v, r, s components
 */
export function splitSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  const sig = signature.slice(2); // Remove 0x prefix
  const r = `0x${sig.slice(0, 64)}` as Hex;
  const s = `0x${sig.slice(64, 128)}` as Hex;
  let v = parseInt(sig.slice(128, 130), 16);
  
  // Handle EIP-155 v values
  if (v < 27) {
    v += 27;
  }
  
  return { v, r, s };
}

/**
 * Join v, r, s into a single signature
 */
export function joinSignature(v: number, r: Hex, s: Hex): Hex {
  // Normalize v to 0 or 1
  const normalizedV = v >= 27 ? v - 27 : v;
  return `0x${r.slice(2)}${s.slice(2)}${normalizedV.toString(16).padStart(2, '0')}` as Hex;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 2592000)}mo`;
}

/**
 * Parse duration string to seconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d|w|mo|y)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    mo: 2592000, // 30 days
    y: 31536000, // 365 days
  };
  
  return value * multipliers[unit];
}

/**
 * Calculate stream rate per second
 */
export function calculateRatePerSecond(
  totalAmount: bigint,
  durationSeconds: number,
  cliffPercent: number = 0
): bigint {
  const cliffAmount = (totalAmount * BigInt(cliffPercent)) / 100n;
  const streamingAmount = totalAmount - cliffAmount;
  
  if (durationSeconds <= 0) return 0n;
  return streamingAmount / BigInt(durationSeconds);
}

/**
 * Calculate unlocked amount for a stream
 */
export function calculateUnlockedAmount(
  depositAmount: bigint,
  _startTime: number,
  endTime: number,
  cliffTime: number,
  cliffAmount: bigint,
  ratePerSecond: bigint,
  currentTime: number = getCurrentTimestamp()
): bigint {
  if (currentTime < cliffTime) return 0n;
  if (currentTime >= endTime) return depositAmount;
  
  const timeAfterCliff = BigInt(currentTime - cliffTime);
  const streamed = cliffAmount + (timeAfterCliff * ratePerSecond);
  
  return streamed > depositAmount ? depositAmount : streamed;
}

/**
 * Format USD amount
 */
export function formatUSD(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await sleep(delayMs * Math.pow(2, attempt - 1));
      }
    }
  }
  
  throw lastError;
}
