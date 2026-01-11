/**
 * Next.js Middleware for Rate Limiting
 * 
 * Applies rate limiting to API endpoints:
 * - /api/streams: 10 requests/minute per wallet address or IP
 * - /api/relay: 5 requests/minute per IP (transaction relay protection)
 * - Other API routes: 30 requests/minute per IP
 * 
 * Returns 429 Too Many Requests with Retry-After header when limit exceeded.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  streamsLimiter,
  relayLimiter,
  generalLimiter,
  isRateLimited,
  getRateLimitHeaders,
} from './lib/rate-limit';

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
    return body.sender || body.recipientAddress || body.senderAddress || body.address || null;
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
  
  const ip = getClientIp(request);
  
  // Apply endpoint-specific rate limiting
  if (pathname.startsWith('/api/relay')) {
    // Relay endpoint - 5/min per IP (transaction relay protection)
    if (isRateLimited(relayLimiter, ip)) {
      const headers = getRateLimitHeaders(relayLimiter, ip);
      return createRateLimitResponse(headers);
    }
    
    // Add rate limit headers to response
    const response = NextResponse.next();
    const headers = getRateLimitHeaders(relayLimiter, ip);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
  
  if (pathname.startsWith('/api/streams')) {
    // Streams endpoint - rate limit by wallet address if available, otherwise by IP
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
    
    if (isRateLimited(streamsLimiter, rateLimitKey)) {
      const headers = getRateLimitHeaders(streamsLimiter, rateLimitKey);
      return createRateLimitResponse(headers);
    }
    
    const response = NextResponse.next();
    const headers = getRateLimitHeaders(streamsLimiter, rateLimitKey);
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
