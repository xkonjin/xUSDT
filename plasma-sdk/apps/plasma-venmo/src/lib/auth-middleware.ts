/**
 * Authentication Middleware
 * 
 * Provides authentication and authorization for API routes.
 * Fixes the missing authentication on sensitive endpoints like /api/claims.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Address } from 'viem';
import { recoverMessageAddress } from 'viem';

// =============================================================================
// Types
// =============================================================================

export interface AuthenticatedUser {
  address: Address;
  email?: string;
  authenticatedAt: number;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Verify session token from request headers.
 * In production, this should validate against your session store (Redis, DB, etc.)
 */
export async function verifySession(request: NextRequest): Promise<AuthResult> {
  // Check for session cookie or authorization header
  const sessionToken = request.cookies.get('session')?.value 
    || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!sessionToken) {
    return { authenticated: false, error: 'No session token provided' };
  }

  try {
    // In production, validate session against your session store
    // This is a placeholder implementation
    const session = await validateSessionToken(sessionToken);
    
    if (!session) {
      return { authenticated: false, error: 'Invalid or expired session' };
    }

    return {
      authenticated: true,
      user: {
        address: session.address,
        email: session.email,
        authenticatedAt: session.authenticatedAt,
      },
    };
  } catch (error) {
    console.error('[auth] Session verification failed', error);
    return { authenticated: false, error: 'Session verification failed' };
  }
}

/**
 * Validate session token against session store.
 * Replace with your actual session validation logic.
 */
async function validateSessionToken(token: string): Promise<AuthenticatedUser | null> {
  // In production, query your session store (Redis, database, etc.)
  // Example with Redis:
  // const session = await redis.get(`session:${token}`);
  // return session ? JSON.parse(session) : null;

  // For Privy integration, you would validate the Privy token here
  try {
    // Decode and verify JWT or session token
    // This is a placeholder - implement based on your auth provider
    const decoded = decodeSessionToken(token);
    return decoded;
  } catch {
    return null;
  }
}

function decodeSessionToken(token: string): AuthenticatedUser | null {
  void token;
  // Placeholder - implement based on your auth system
  // For Privy, use their SDK to verify the token
  return null;
}

// =============================================================================
// Signature-Based Authentication
// =============================================================================

export interface SignatureAuthParams {
  address: Address;
  message: string;
  signature: string;
  timestamp: number;
}

/**
 * Verify a signed message for authentication.
 * Useful for wallet-based authentication without sessions.
 */
export async function verifySignatureAuth(params: SignatureAuthParams): Promise<AuthResult> {
  const { address, message, signature, timestamp } = params;

  // Check timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const maxAge = 5 * 60; // 5 minutes
  
  if (now - timestamp > maxAge) {
    return { authenticated: false, error: 'Signature expired' };
  }

  try {
    // Recover the signer address from the signature
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    // Verify the recovered address matches the claimed address
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return { authenticated: false, error: 'Signature verification failed' };
    }

    return {
      authenticated: true,
      user: {
        address: recoveredAddress as Address,
        authenticatedAt: timestamp,
      },
    };
  } catch (error) {
    console.error('[auth] Signature verification error', error);
    return { authenticated: false, error: 'Invalid signature' };
  }
}

// =============================================================================
// Authorization Helpers
// =============================================================================

/**
 * Check if user is authorized to access a resource.
 */
export function isAuthorizedForResource(
  user: AuthenticatedUser,
  resourceOwnerAddress: Address
): boolean {
  return user.address.toLowerCase() === resourceOwnerAddress.toLowerCase();
}

/**
 * Create an unauthorized response.
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create a forbidden response.
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

// =============================================================================
// Middleware Wrapper
// =============================================================================

export type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthenticatedUser
) => Promise<NextResponse>;

/**
 * Wrap an API handler with authentication.
 * 
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (request, user) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ address: user.address });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifySession(request);

    if (!authResult.authenticated || !authResult.user) {
      return unauthorizedResponse(authResult.error);
    }

    return handler(request, authResult.user);
  };
}

/**
 * Wrap an API handler with authentication and resource authorization.
 * 
 * Usage:
 * ```typescript
 * export const GET = withAuthAndOwnership(
 *   async (request, user) => {
 *     // user is authenticated and owns the resource
 *     return NextResponse.json({ data: 'secret' });
 *   },
 *   (request) => request.nextUrl.searchParams.get('address') as Address
 * );
 * ```
 */
export function withAuthAndOwnership(
  handler: AuthenticatedHandler,
  getResourceOwner: (request: NextRequest) => Address | null
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await verifySession(request);

    if (!authResult.authenticated || !authResult.user) {
      return unauthorizedResponse(authResult.error);
    }

    const resourceOwner = getResourceOwner(request);
    
    if (!resourceOwner) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    if (!isAuthorizedForResource(authResult.user, resourceOwner)) {
      return forbiddenResponse('You do not have access to this resource');
    }

    return handler(request, authResult.user);
  };
}

// =============================================================================
// CSRF Protection
// =============================================================================

const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE = 'csrf_token';

/**
 * Generate a CSRF token.
 */
export function generateCSRFToken(): string {
  const crypto = globalThis.crypto || webcrypto;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify CSRF token from request.
 */
export function verifyCSRFToken(request: NextRequest): boolean {
  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return constantTimeCompare(headerToken, cookieToken);
}

function constantTimeCompare(a: string, b: string): boolean {
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
 * Wrap an API handler with CSRF protection.
 */
export function withCSRFProtection(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Only check CSRF for state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      if (!verifyCSRFToken(request)) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    return handler(request);
  };
}
