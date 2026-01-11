/**
 * Telegram Auth Handler
 *
 * TG-WEB-001: Business logic for Telegram initData validation
 * Separated from Next.js route for testability
 */

import { randomBytes } from 'crypto';
import { validateTelegramInitData, TelegramUser } from '@/lib/telegram-auth';

/**
 * Auth request body
 */
export interface AuthRequest {
  initData: string;
}

/**
 * Auth response
 */
export interface AuthResponse {
  success?: boolean;
  error?: string;
  user?: TelegramUser;
  authDate?: number;
  startParam?: string;
  queryId?: string;
  sessionToken?: string;
}

/**
 * Generate a session token
 * In production, this would be a JWT with proper signing
 */
function generateSessionToken(user: TelegramUser): string {
  const randomPart = randomBytes(16).toString('hex');
  const timestamp = Date.now().toString(36);
  return `tg_${user.id}_${timestamp}_${randomPart}`;
}

/**
 * Handle Telegram authentication request
 */
export async function handleTelegramAuth(
  body: AuthRequest
): Promise<{ status: number; data: AuthResponse }> {
  // Check for bot token configuration
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return {
      status: 500,
      data: { error: 'Server configuration error' },
    };
  }

  // Validate request body
  if (!body || body.initData === undefined) {
    return {
      status: 400,
      data: { error: 'Missing initData' },
    };
  }

  const { initData } = body;

  // Check for empty initData
  if (!initData) {
    return {
      status: 400,
      data: { error: 'Empty initData' },
    };
  }

  // Validate initData
  const result = await validateTelegramInitData(initData, botToken);

  if (!result.valid) {
    // Map validation errors to HTTP status codes
    const status = result.error === 'Empty initData' ? 400 : 401;
    return {
      status,
      data: { error: result.error },
    };
  }

  // Generate session token
  const sessionToken = result.user ? generateSessionToken(result.user) : undefined;

  return {
    status: 200,
    data: {
      success: true,
      user: result.user,
      authDate: result.authDate,
      startParam: result.startParam,
      queryId: result.queryId,
      sessionToken,
    },
  };
}
