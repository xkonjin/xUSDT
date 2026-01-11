/**
 * SubKiller Rate Limiting Middleware
 * SUB-003: Add rate limiting to API endpoints
 * 
 * Rate limits:
 * - /api/scan: 3 requests per minute (Gmail quota protection)
 * - /api/categorize: 5 requests per minute (OpenAI cost protection)
 * 
 * Returns 429 Too Many Requests with Retry-After header when exceeded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter, getClientIP, getRouteType, RATE_LIMITS } from './src/lib/rate-limiter';

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Next.js Middleware for rate limiting and security
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const routeType = getRouteType(pathname);

  // For non-rate-limited routes, still add security headers
  if (routeType === 'other') {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  const rateLimiter = getRateLimiter();
  const clientIP = getClientIP(request);
  const config = RATE_LIMITS[routeType];

  const result = rateLimiter.check(clientIP, config, routeType);

  // Add rate limit headers to all responses
  const response = result.allowed
    ? NextResponse.next()
    : NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded for ${routeType}. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        { status: 429 }
      );

  // Add security headers
  addSecurityHeaders(response);

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetAt));

  if (!result.allowed && result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter));
  }

  return response;
}

/**
 * Configure which paths the middleware should run on
 * Apply to all routes except static files for security headers
 */
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
