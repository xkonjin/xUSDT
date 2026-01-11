/**
 * Telegram initData Validation Utility
 *
 * TG-WEB-001: Implements HMAC-SHA256 signature validation for Telegram WebApp
 *
 * Validation algorithm:
 * 1. Parse initData query string
 * 2. Extract hash parameter
 * 3. Sort remaining params alphabetically
 * 4. Join with newlines
 * 5. HMAC-SHA256 with key = HMAC-SHA256("WebAppData", botToken)
 * 6. Compare calculated hash with provided hash
 */

import { createHmac } from 'crypto';

/**
 * Telegram initData parsed object
 */
export interface TelegramInitData {
  auth_date?: string;
  query_id?: string;
  user?: string;
  receiver?: string;
  chat?: string;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: string;
  hash?: string;
  [key: string]: string | undefined;
}

/**
 * Telegram user object
 */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  user?: TelegramUser;
  authDate?: number;
  startParam?: string;
  queryId?: string;
}

/**
 * Maximum age for auth_date (24 hours in seconds)
 */
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/**
 * Parse Telegram initData query string into an object
 */
export function parseTelegramInitData(initData: string): TelegramInitData {
  if (!initData) {
    return {};
  }

  const result: TelegramInitData = {};
  const params = new URLSearchParams(initData);

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * Generate the data check string for HMAC validation
 * Sorts params alphabetically, excludes hash, and joins with newlines
 */
export function generateDataCheckString(data: TelegramInitData): string {
  const entries = Object.entries(data)
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([key, value]) => `${key}=${value}`).join('\n');
}

/**
 * Compute HMAC-SHA256 and return hex string
 */
export async function computeHmacSha256(
  key: string | Buffer,
  data: string
): Promise<string> {
  const hmac = createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Compute HMAC-SHA256 and return Buffer
 */
function computeHmacSha256Buffer(key: string | Buffer, data: string): Buffer {
  const hmac = createHmac('sha256', key);
  hmac.update(data);
  return hmac.digest();
}

/**
 * Validate Telegram initData HMAC signature
 */
export async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<ValidationResult> {
  // Check for empty initData
  if (!initData) {
    return { valid: false, error: 'Empty initData' };
  }

  // Parse initData
  const data = parseTelegramInitData(initData);

  // Check for required fields
  if (!data.hash) {
    return { valid: false, error: 'Missing hash' };
  }

  if (!data.auth_date) {
    return { valid: false, error: 'Missing auth_date' };
  }

  // Check auth_date expiration
  const authDate = parseInt(data.auth_date, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AUTH_AGE_SECONDS) {
    return { valid: false, error: 'Auth data expired' };
  }

  // Generate data check string
  const dataCheckString = generateDataCheckString(data);

  // Compute secret key: HMAC-SHA256("WebAppData", botToken)
  const secretKey = computeHmacSha256Buffer('WebAppData', botToken);

  // Compute hash: HMAC-SHA256(dataCheckString, secretKey)
  const computedHash = await computeHmacSha256(secretKey, dataCheckString);

  // Compare hashes (constant-time comparison)
  if (!timingSafeEqual(computedHash, data.hash)) {
    return { valid: false, error: 'Invalid signature' };
  }

  // Parse user if present
  let user: TelegramUser | undefined;
  if (data.user) {
    try {
      user = JSON.parse(data.user);
    } catch {
      // Invalid user JSON, but signature is valid
    }
  }

  return {
    valid: true,
    user,
    authDate,
    startParam: data.start_param,
    queryId: data.query_id,
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Create valid initData for testing purposes
 * This generates a properly signed initData string
 */
export async function createValidInitData(
  data: Omit<TelegramInitData, 'hash'>,
  botToken: string
): Promise<string> {
  // Generate data check string
  const dataCheckString = generateDataCheckString(data);

  // Compute secret key: HMAC-SHA256("WebAppData", botToken)
  const secretKey = computeHmacSha256Buffer('WebAppData', botToken);

  // Compute hash: HMAC-SHA256(dataCheckString, secretKey)
  const hash = await computeHmacSha256(secretKey, dataCheckString);

  // Build the query string
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      params.append(key, value);
    }
  }
  params.append('hash', hash);

  return params.toString();
}
