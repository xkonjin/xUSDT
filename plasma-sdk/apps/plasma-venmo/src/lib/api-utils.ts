/**
 * API Utilities for Plenmo
 * 
 * Shared utilities for API routes including:
 * - Rate limiting
 * - Input validation
 * - Error responses
 * - Address validation
 */

import { NextResponse } from 'next/server';
import { isAddress, getAddress } from 'viem';
import { getRateLimiter, getClientIP, RATE_LIMIT_CONFIGS, type RateLimitConfig } from './rate-limiter';
import { getAuthenticatedUser, isAuthEnabled, type AuthUser } from './auth';

// =============================================================================
// Types
// =============================================================================

export interface APIContext {
  user: AuthUser | null;
  clientIP: string;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.payment
): { allowed: boolean; headers: RateLimitHeaders; retryAfter?: number } {
  const limiter = getRateLimiter();
  const clientIP = getClientIP(request);
  
  const result = limiter.check(clientIP, config);
  
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
  
  return {
    allowed: result.allowed,
    headers,
    retryAfter: result.retryAfter,
  };
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { 
      error: 'Too many requests. Please try again later.',
      retryAfter,
    },
    { 
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  );
}

// =============================================================================
// Address Validation
// =============================================================================

/**
 * Validate and normalize an Ethereum address
 */
export function validateAddress(address: string | null | undefined): { 
  valid: boolean; 
  normalized?: string; 
  error?: string;
} {
  if (!address) {
    return { valid: false, error: 'Address is required' };
  }
  
  const trimmed = address.trim();
  
  if (!isAddress(trimmed)) {
    return { valid: false, error: 'Invalid Ethereum address format' };
  }
  
  try {
    const normalized = getAddress(trimmed);
    return { valid: true, normalized };
  } catch {
    return { valid: false, error: 'Invalid address checksum' };
  }
}

/**
 * Validate multiple addresses
 */
export function validateAddresses(addresses: Record<string, string | null | undefined>): {
  valid: boolean;
  normalized: Record<string, string>;
  errors: Record<string, string>;
} {
  const normalized: Record<string, string> = {};
  const errors: Record<string, string> = {};
  
  for (const [key, address] of Object.entries(addresses)) {
    const result = validateAddress(address);
    if (result.valid && result.normalized) {
      normalized[key] = result.normalized;
    } else if (result.error) {
      errors[key] = result.error;
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    normalized,
    errors,
  };
}

// =============================================================================
// Error Responses
// =============================================================================

export function errorResponse(
  message: string, 
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}

export function validationError(errors: Record<string, string>): NextResponse {
  return NextResponse.json(
    { 
      error: 'Validation failed',
      details: errors,
    },
    { status: 400 }
  );
}

export function authError(message: string = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

export function forbiddenError(message: string = 'Access denied'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

// =============================================================================
// Route Handler Wrapper
// =============================================================================

interface RouteOptions {
  requireAuth?: boolean;
  rateLimit?: RateLimitConfig | false;
}

/**
 * Wrap a route handler with common middleware
 */
export function withAPIMiddleware<T>(
  handler: (request: Request, context: APIContext) => Promise<NextResponse<T>>,
  options: RouteOptions = {}
) {
  const { requireAuth: needsAuth = false, rateLimit = RATE_LIMIT_CONFIGS.payment } = options;
  
  return async (request: Request): Promise<NextResponse> => {
    // Rate limiting
    if (rateLimit !== false) {
      const { allowed, headers, retryAfter } = checkRateLimit(request, rateLimit);
      
      if (!allowed && retryAfter) {
        return rateLimitResponse(retryAfter);
      }
    }
    
    // Authentication
    let user: AuthUser | null = null;
    
    if (needsAuth && isAuthEnabled()) {
      user = await getAuthenticatedUser(request);
      if (!user) {
        return authError();
      }
    } else {
      // Try to get user even if not required (for logging/context)
      user = await getAuthenticatedUser(request);
    }
    
    const context: APIContext = {
      user,
      clientIP: getClientIP(request),
    };
    
    return handler(request, context);
  };
}
