/**
 * CSRF Protection Module
 * VENMO-004: Add CSRF Protection
 * 
 * Provides:
 * - Secure CSRF token generation
 * - Cookie-based CSRF token management
 * - Token validation for POST/PUT/DELETE routes
 * - CSRF token in API responses
 */

import { NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'crypto';

// CSRF constants
export const CSRF_COOKIE_NAME = 'csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a secure CSRF token
 * Uses crypto.randomBytes for cryptographically secure random generation
 */
export function generateCSRFToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Validate CSRF token using timing-safe comparison
 * Prevents timing attacks by using constant-time string comparison
 */
export function validateCSRFToken(cookieToken: string, headerToken: string): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return false;
  }
  
  if (cookieToken.length === 0 || headerToken.length === 0) {
    return false;
  }
  
  // Ensure both tokens are same length before comparison
  if (cookieToken.length !== headerToken.length) {
    return false;
  }
  
  try {
    const cookieBuffer = Buffer.from(cookieToken, 'utf-8');
    const headerBuffer = Buffer.from(headerToken, 'utf-8');
    
    return timingSafeEqual(cookieBuffer, headerBuffer);
  } catch {
    return false;
  }
}

/**
 * Create a Set-Cookie header value for CSRF token
 * Sets HttpOnly, SameSite=Strict, and Secure (in production)
 */
export function setCSRFCookie(token: string): string {
  const parts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
  ];
  
  // Add Secure flag in production
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  
  return parts.join('; ');
}

/**
 * Extract CSRF token from cookie string
 */
export function getCSRFFromCookie(cookieString: string | null | undefined): string | null {
  if (!cookieString) {
    return null;
  }
  
  const cookies = cookieString.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME && value) {
      return value;
    }
  }
  
  return null;
}

/**
 * Response data structure for CSRF response
 * Used by createCSRFResponse and createCSRFResponseData
 */
export interface CSRFResponseData {
  body: unknown;
  status: number;
  headers: Record<string, string>;
}

/**
 * Create CSRF response data (for testing and utilities)
 */
export function createCSRFResponseData(
  body: unknown,
  token: string,
  status: number = 200
): CSRFResponseData {
  return {
    body,
    status,
    headers: {
      [CSRF_HEADER_NAME]: token,
      'Set-Cookie': setCSRFCookie(token),
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Create a NextResponse with CSRF token headers and cookie
 */
export function createCSRFResponse(
  body: unknown,
  token: string,
  status: number = 200
): NextResponse {
  const data = createCSRFResponseData(body, token, status);
  
  const response = NextResponse.json(data.body, { status: data.status });
  
  // Set CSRF token in response header (for client to read)
  response.headers.set(CSRF_HEADER_NAME, token);
  
  // Set CSRF cookie
  response.headers.set('Set-Cookie', setCSRFCookie(token));
  
  return response;
}

/**
 * CSRF validation middleware helper
 * Returns null if valid, error response if invalid
 */
export function validateCSRFMiddleware(
  request: Request,
  cookieToken: string | null
): NextResponse | null {
  const method = request.method;
  
  // Only validate state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }
  
  // Skip CSRF for preflight requests
  if (method === 'OPTIONS') {
    return null;
  }
  
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  if (!cookieToken) {
    return NextResponse.json(
      { error: 'CSRF token missing from cookie' },
      { status: 403 }
    );
  }
  
  if (!headerToken) {
    return NextResponse.json(
      { error: 'CSRF token missing from header' },
      { status: 403 }
    );
  }
  
  if (!validateCSRFToken(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: 'CSRF token validation failed' },
      { status: 403 }
    );
  }
  
  return null;
}
