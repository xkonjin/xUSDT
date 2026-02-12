/**
 * Authentication Module for Plenmo API
 * 
 * Handles Privy JWT verification and user authentication.
 * Uses @privy-io/server-auth for token verification.
 */

import type { PrivyClient as PrivyClientType } from '@privy-io/server-auth';

// =============================================================================
// Types
// =============================================================================

export interface AuthUser {
  userId: string;
  appId: string;
  walletAddress?: string;
}

export class AuthError extends Error {
  public statusCode: number;
  
  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

// =============================================================================
// Privy Client
// =============================================================================

let privyClient: PrivyClientType | null = null;
let privyClientPromise: Promise<PrivyClientType | null> | null = null;

async function getPrivyClient(): Promise<PrivyClientType | null> {
  // Avoid loading Privy server auth in mock-mode (often used in local dev/tests).
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return null;
  }

  if (privyClient) {
    return privyClient;
  }

  if (privyClientPromise) {
    return privyClientPromise;
  }
  
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  
  if (!appId || !appSecret) {
    return null;
  }
  
  privyClientPromise = (async () => {
    try {
      const mod = await import('@privy-io/server-auth');
      privyClient = new mod.PrivyClient(appId, appSecret);
      return privyClient;
    } catch {
      return null;
    } finally {
      privyClientPromise = null;
    }
  })();

  return privyClientPromise;
}

// =============================================================================
// Token Handling
// =============================================================================

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  
  const token = trimmed.slice(7).trim();
  return token || null;
}

export async function verifyPrivyToken(token: string): Promise<AuthUser> {
  const client = await getPrivyClient();
  
  if (!client) {
    throw new AuthError('Authentication service not configured', 503);
  }
  
  try {
    const result = await client.verifyAuthToken(token);
    return {
      userId: result.userId,
      appId: result.appId,
    };
  } catch {
    throw new AuthError('Invalid or expired token', 401);
  }
}

// =============================================================================
// Request Authentication
// =============================================================================

export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);
  
  if (!token) return null;
  
  try {
    return await verifyPrivyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  
  return user;
}

// =============================================================================
// Soft Auth (for gradual migration)
// =============================================================================

/**
 * Check if auth is enabled based on environment.
 * Allows gradual rollout of authentication.
 */
export function isAuthEnabled(): boolean {
  // Auth is disabled in development by default for easier testing
  if (process.env.NODE_ENV === 'development') {
    return process.env.REQUIRE_AUTH === 'true';
  }
  // Auth is enabled in production unless explicitly disabled
  return process.env.REQUIRE_AUTH !== 'false';
}

/**
 * Soft auth check - returns user if authenticated, null otherwise.
 * Doesn't throw, useful for routes that should work with or without auth.
 */
export async function softAuth(request: Request): Promise<AuthUser | null> {
  if (!isAuthEnabled()) {
    return null;
  }
  return getAuthenticatedUser(request);
}
