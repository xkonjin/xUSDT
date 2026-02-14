/**
 * Authentication Module
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
}

/**
 * Custom authentication error with status code.
 */
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

/**
 * Get or create Privy client instance.
 * Lazy-loads to avoid build-time errors.
 */
async function getPrivyClient(): Promise<PrivyClientType | null> {
  if (privyClient) {
    return privyClient;
  }
  
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  
  if (!appId || !appSecret) {
    return null;
  }
  
  // Dynamic import to avoid build-time initialization
  const { PrivyClient } = await import('@privy-io/server-auth');
  privyClient = new PrivyClient(appId, appSecret);
  
  return privyClient;
}

// =============================================================================
// Token Extraction
// =============================================================================

/**
 * Extract bearer token from Authorization header.
 * 
 * @param authHeader - Authorization header value
 * @returns Token string or null if invalid
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }
  
  const trimmed = authHeader.trim();
  
  // Check for Bearer prefix (case-insensitive)
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  
  const token = trimmed.slice(7).trim();
  
  // Return null if token is empty
  return token || null;
}

// =============================================================================
// Token Verification
// =============================================================================

/**
 * Verify a Privy JWT token.
 * 
 * @param token - JWT token to verify
 * @returns User info if valid
 * @throws AuthError if invalid or Privy not configured
 */
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

/**
 * Get authenticated user from request.
 * Returns null if not authenticated (doesn't throw).
 * 
 * @param request - Incoming request
 * @returns User info or null
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);
  
  if (!token) {
    return null;
  }
  
  try {
    return await verifyPrivyToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authentication for a request.
 * Throws AuthError if not authenticated.
 * 
 * @param request - Incoming request
 * @returns User info
 * @throws AuthError if not authenticated
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  
  return user;
}

// =============================================================================
// Route Protection Helpers
// =============================================================================

/**
 * Check if a route path is public (doesn't require auth).
 */
export function isPublicRoute(pathname: string): boolean {
  const publicPatterns = [
    /^\/api\/scan-receipt/,        // Receipt scanning
    /^\/api\/pay\/[^/]+$/,         // Payment intent GET (public payment page)
    /^\/api\/health/,              // Health checks
  ];
  
  return publicPatterns.some(pattern => pattern.test(pathname));
}

/**
 * Check if a route path requires authentication.
 */
export function requiresAuth(pathname: string): boolean {
  const protectedPatterns = [
    /^\/api\/bills/,               // Bill CRUD operations
    /^\/api\/relay/,               // Transaction relay
  ];
  
  return protectedPatterns.some(pattern => pattern.test(pathname));
}
