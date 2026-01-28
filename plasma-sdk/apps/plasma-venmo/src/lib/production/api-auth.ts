/**
 * API Authentication Middleware
 * Provides authentication and CSRF protection for API routes
 * Uses crypto-based CSRF tokens (no external dependencies)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import crypto from 'crypto';

// Initialize the Privy client
const privy = new PrivyClient(
  process.env.PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || ''
);

// CSRF token configuration
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__csrf';

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const data = `${timestamp}:${random}`;
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');
  return `${data}:${signature}`;
}

/**
 * Verify a CSRF token
 */
export function verifyCsrfToken(token: string): boolean {
  if (!token) return false;
  
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  
  const [timestamp, random, signature] = parts;
  const data = `${timestamp}:${random}`;
  const expectedSignature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('hex');
  
  // Timing-safe comparison
  if (signature.length !== expectedSignature.length) return false;
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Authenticated user context
 */
export interface AuthContext {
  userId: string;
  appId: string;
  issuedAt: number;
  expiration: number;
}

/**
 * Authentication result
 */
export type AuthResult = 
  | { success: true; context: AuthContext }
  | { success: false; error: string; status: number };

/**
 * Verify Privy access token
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Authorization header is missing or invalid',
      status: 401
    };
  }
  
  const accessToken = authHeader.split(' ')[1];
  
  try {
    const claims = await privy.verifyAccessToken(accessToken);
    return {
      success: true,
      context: {
        userId: claims.userId,
        appId: claims.appId,
        issuedAt: claims.issuedAt,
        expiration: claims.expiration
      }
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      success: false,
      error: 'Invalid or expired access token',
      status: 401
    };
  }
}

/**
 * Verify CSRF token from request
 */
export function verifyCsrf(request: NextRequest): boolean {
  // Skip CSRF for GET, HEAD, OPTIONS
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }
  
  const tokenFromHeader = request.headers.get(CSRF_TOKEN_HEADER);
  const tokenFromCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  
  // Both must be present and match
  if (!tokenFromHeader || !tokenFromCookie) {
    return false;
  }
  
  return tokenFromHeader === tokenFromCookie && verifyCsrfToken(tokenFromHeader);
}

/**
 * Create authenticated response with CSRF token
 */
export function createAuthResponse(
  data: unknown,
  status: number = 200
): NextResponse {
  const csrfToken = generateCsrfToken();
  const response = NextResponse.json(data, { status });
  
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  response.headers.set(CSRF_TOKEN_HEADER, csrfToken);
  
  return response;
}

/**
 * Create error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Higher-order function to wrap API route handlers with auth and CSRF
 */
export function withAuth(
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Verify CSRF for state-changing requests
    if (!verifyCsrf(request)) {
      return createErrorResponse('Invalid CSRF token', 403);
    }
    
    // Verify authentication
    const authResult = await verifyAuth(request);
    
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status);
    }
    
    // Call the handler with auth context
    return handler(request, authResult.context);
  };
}

/**
 * Verify request signature for sensitive operations
 */
export function verifyRequestSignature(
  body: string,
  signature: string
): boolean {
  const secret = process.env.REQUEST_SIGNING_SECRET;
  if (!secret) {
    console.warn('REQUEST_SIGNING_SECRET not configured');
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
