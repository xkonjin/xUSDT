/**
 * Next.js Middleware for Rate Limiting and Authentication
 * 
 * Applies rate limiting to API endpoints:
 * - /api/scan-receipt: 5 requests/minute per IP (OpenAI cost protection)
 * - /api/bills: 10 requests/minute per wallet address or IP
 * - Other API routes: 30 requests/minute per IP
 * 
 * Authentication:
 * - /api/bills/*, /api/relay: Require Privy JWT authentication
 * - /api/scan-receipt, /api/pay/[intentId] GET: Public access
 * 
 * Returns 429 Too Many Requests with Retry-After header when limit exceeded.
 * Returns 401 Unauthorized when authentication required but missing/invalid.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  scanReceiptLimiter,
  billsLimiter,
  generalLimiter,
  isRateLimited,
  getRateLimitHeaders,
} from './lib/rate-limit';
import { isPublicRoute, requiresAuth } from './lib/auth';

/**
 * Extract client IP from request headers.
 * Handles proxied requests (X-Forwarded-For, X-Real-IP).
 */
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback - in production, should always have one of the above
  return '127.0.0.1';
}

/**
 * Extract wallet address from request body (for authenticated endpoints).
 */
async function getWalletAddress(request: NextRequest): Promise<string | null> {
  try {
    // Clone the request to read body without consuming it
    const cloned = request.clone();
    const body = await cloned.json();
    
    // Check for common wallet address fields
    return body.creatorAddress || body.walletAddress || body.address || null;
  } catch {
    return null;
  }
}

/**
 * Create a 429 Too Many Requests response.
 */
function createRateLimitResponse(headers: Record<string, string>): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: parseInt(headers['Retry-After'] || '60', 10),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

/**
 * Create a 401 Unauthorized response.
 */
function createUnauthorizedResponse(): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Authentication required. Please provide a valid Bearer token.',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer',
      },
    }
  );
}

/**
 * Verify Privy JWT token.
 * Returns true if valid, false otherwise.
 * Note: Full verification happens in API routes. Middleware does basic check.
 */
function hasAuthorizationHeader(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  // Check for Bearer prefix
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return false;
  
  // Check that there's a token after "Bearer "
  const token = trimmed.slice(7).trim();
  return token.length > 0;
}

/**
 * Middleware function for rate limiting.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Skip health check endpoints
  if (pathname === '/api/health' || pathname === '/api/healthz') {
    return NextResponse.next();
  }
  
  // Check authentication for protected routes
  // Note: Full JWT verification happens in API routes.
  // Middleware does basic Bearer token presence check for early rejection.
  if (requiresAuth(pathname) && !isPublicRoute(pathname)) {
    if (!hasAuthorizationHeader(request)) {
      return createUnauthorizedResponse();
    }
  }
  
  const ip = getClientIp(request);
  
  // Apply endpoint-specific rate limiting
  if (pathname.startsWith('/api/scan-receipt')) {
    // Scan receipt - 5/min per IP (expensive OpenAI calls)
    if (isRateLimited(scanReceiptLimiter, ip)) {
      const headers = getRateLimitHeaders(scanReceiptLimiter, ip);
      return createRateLimitResponse(headers);
    }
    
    // Add rate limit headers to response
    const response = NextResponse.next();
    const headers = getRateLimitHeaders(scanReceiptLimiter, ip);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  if (pathname.startsWith('/api/bills')) {
    // Bills endpoint - rate limit by wallet address if available, otherwise by IP
    let rateLimitKey = ip;
    
    // For POST requests, try to get wallet address
    if (request.method === 'POST') {
      const walletAddress = await getWalletAddress(request);
      if (walletAddress) {
        rateLimitKey = walletAddress.toLowerCase();
      }
    }
    
    // For GET requests with address param, use that
    if (request.method === 'GET') {
      const addressParam = request.nextUrl.searchParams.get('address');
      if (addressParam) {
        rateLimitKey = addressParam.toLowerCase();
      }
    }
    
    if (isRateLimited(billsLimiter, rateLimitKey)) {
      const headers = getRateLimitHeaders(billsLimiter, rateLimitKey);
      return createRateLimitResponse(headers);
    }
    
    const response = NextResponse.next();
    const headers = getRateLimitHeaders(billsLimiter, rateLimitKey);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  // General rate limiting for other API routes
  if (isRateLimited(generalLimiter, ip)) {
    const headers = getRateLimitHeaders(generalLimiter, ip);
    return createRateLimitResponse(headers);
  }
  
  const response = NextResponse.next();
  const headers = getRateLimitHeaders(generalLimiter, ip);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Configure which paths the middleware should run on.
 */
export const config = {
  matcher: '/api/:path*',
};
