/**
 * Redis-based Rate Limiter for Vercel
 * VENMO-003: Implement rate limiting middleware (Redis version)
 *
 * Uses Upstash Redis for distributed rate limiting
 * Works across multiple serverless function instances
 *
 * Installation:
 * npm install @upstash/redis
 *
 * Environment Variables:
 * UPSTASH_REDIS_REST_URL=...
 * UPSTASH_REDIS_REST_TOKEN=...
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client with retry logic
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    });
  }
  return redisClient;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check rate limit using Redis
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  routeType?: string
): Promise<RateLimitResult> {
  // Check if Redis is configured
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    // Fallback to permissive mode if Redis is not configured
    console.warn('[rate-limiter-redis] Redis not configured, allowing request');
    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
    };
  }

  // Generate unique key for this identifier and route type
  const key = routeType ? `${identifier}:${routeType}` : identifier;
  const redisKey = `ratelimit:${key}`;
  const now = Date.now();
  const resetAt = now + config.windowMs;

  try {
    const redis = getRedisClient();

    // Increment counter
    const currentCount = (await redis.incr(redisKey)) as number;

    // Set expiry on first request
    if (currentCount === 1) {
      await redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
    }

    const remaining = Math.max(0, config.maxRequests - currentCount);

    // Check if over limit
    if (currentCount > config.maxRequests) {
      const ttl = await redis.ttl(redisKey);
      const retryAfter = ttl > 0 ? ttl : config.windowMs / 1000;

      return {
        allowed: false,
        remaining: 0,
        limit: config.maxRequests,
        resetAt,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining,
      limit: config.maxRequests,
      resetAt,
    };
  } catch (error) {
    // Fallback to permissive mode if Redis is unavailable
    console.error('[rate-limiter-redis] Redis error, allowing request:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
    };
  }
}

/**
 * Predefined configurations for different route types
 */
export const RATE_LIMIT_CONFIGS = {
  // Payment routes: 10 requests per minute
  payment: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Read routes: 100 requests per minute
  read: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Bridge routes: 30 requests per minute (quotes are expensive)
  bridge: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // API routes: 60 requests per minute
  api: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Helper to get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for client IP
  const headers = request.headers;

  // Vercel / Cloudflare headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Cloudflare specific
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Real IP header (nginx)
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

/**
 * Determine route type based on pathname
 */
export function getRouteType(pathname: string): 'payment' | 'read' | 'bridge' | 'api' {
  // Payment routes that modify state
  const paymentPatterns = [
    '/api/submit-transfer',
    '/api/claims',
    '/api/requests',
    '/api/payment-links',
    '/api/share-links',
    '/api/referrals/pay',
    '/api/relay',
    '/api/notify',
  ];

  // Bridge routes
  const bridgePatterns = ['/api/bridge/quote', '/api/bridge/execute'];

  // Check patterns
  for (const pattern of paymentPatterns) {
    if (pathname.startsWith(pattern)) {
      return 'payment';
    }
  }

  for (const pattern of bridgePatterns) {
    if (pathname.startsWith(pattern)) {
      return 'bridge';
    }
  }

  return 'api';
}

/**
 * Check rate limit and return NextResponse with headers
 */
export async function withRateLimit(
  request: Request,
  routeType: 'payment' | 'read' | 'bridge' | 'api' = 'api'
): Promise<{ allowed: boolean; response?: Response }> {
  const ip = getClientIP(request);
  const config = RATE_LIMIT_CONFIGS[routeType];

  const result = await checkRateLimit(ip, config, routeType);

  if (!result.allowed) {
    const response = new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': (result.retryAfter || 0).toString(),
        },
      }
    );

    return { allowed: false, response };
  }

  // Return allowed result (caller can add headers to their response)
  return { allowed: true, response: undefined };
}

/**
 * Middleware wrapper for Next.js API routes
 * Usage:
 * ```
 * export async function POST(request: Request) {
 *   const { allowed, response: rateLimitResponse } = await withRateLimit(request, 'payment');
 *   if (!allowed) return rateLimitResponse;
 *
 *   // Your route logic here
 * }
 * ```
 */
