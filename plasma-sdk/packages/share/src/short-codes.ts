/**
 * Short Code Generator
 *
 * Generates unique, URL-safe short codes for share links.
 */

import { customAlphabet } from 'nanoid';

// URL-safe alphabet (no confusing characters like 0/O, 1/l/I)
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

// Default short code length (6 chars = 50+ billion combinations)
const DEFAULT_LENGTH = 6;

/**
 * Generate a unique short code for a share link
 */
export function generateShortCode(length: number = DEFAULT_LENGTH): string {
  return customAlphabet(ALPHABET, length)();
}

/**
 * Generate a referral code (more memorable, 8 chars)
 */
export function generateReferralCode(): string {
  return customAlphabet(ALPHABET, 8)();
}

/**
 * Validate a short code format
 */
export function isValidShortCode(code: string): boolean {
  if (!code || code.length < 4 || code.length > 12) {
    return false;
  }
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]+$/.test(code);
}
