/**
 * Next.js Middleware for Plasma Venmo
 * 
 * Implements:
 * - VENMO-003: Rate limiting for API routes
 * 
 * Rate Limits:
 * - Payment routes: 10 requests/minute (submit-transfer, claims, requests, etc.)
 * - Read routes: 100 requests/minute
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory rate limiter (Note: This won't persist across serverless invocations)
// For production, use Redis or similar external store
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Rate limit stores by route type
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMITS = {
  payment: { maxRequests: 10, windowMs: 60 * 1000 },
  read: { maxRequests: 100, windowMs: 60 * 1000 },
};

// Payment routes (state-changing operations)
const PAYMENT_ROUTES = [
  '/api/submit-transfer',
  '/api/claims',
  '/api/requests',
  '/api/payment-links',
  '/api/share-links',
  '/api/referrals/pay',
  '/api/relay',
  '/api/notify',
];

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  // Edge runtime doesn't have socket, use a fallback
  return request.ip || 'unknown';
}

/**
 * Determine route type from pathname
 */
function getRouteType(pathname: string): 'payment' | 'read' {
  // Check POST/PUT/PATCH/DELETE methods for payment classification
  for (const route of PAYMENT_ROUTES) {
    if (pathname.startsWith(route)) {
      return 'payment';
    }
  }
  return 'read';
}

/**
 * Check rate limit and return result
 */
function checkRateLimit(
  identifier: string,
  routeType: 'payment' | 'read'
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const config = RATE_LIMITS[routeType];
  const key = `${identifier}:${routeType}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // If no entry or expired, create new
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  
  // Check if over limit
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only apply rate limiting to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Get client identifier
  const clientIP = getClientIP(request);
  
  // Determine route type based on path and method
  let routeType = getRouteType(pathname);
  
  // Override to payment type for write methods on any route
  const method = request.method;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && routeType === 'read') {
    // Keep specific read routes as read even for POST (like search)
    const readOnlyPosts = ['/api/resolve-recipient', '/api/history'];
    if (!readOnlyPosts.some(route => pathname.startsWith(route))) {
      routeType = 'payment';
    }
  }
  
  // Check rate limit
  const result = checkRateLimit(clientIP, routeType);
  
  // If rate limited, return 429
  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMITS[routeType].maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[routeType].maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetAt));
  
  return response;
}

// Only run on API routes
export const config = {
  matcher: '/api/:path*',
};
