/**
 * Shared Gasless Relay Handler
 *
 * Reusable server-side handler for forwarding EIP-3009 authorizations
 * to the Plasma gasless relayer API. Used by all Plasma apps.
 *
 * @example
 * ```ts
 * // In your Next.js API route:
 * import { createRelayHandler } from '@plasma-pay/gasless';
 *
 * const handler = createRelayHandler();
 * export const POST = handler.POST;
 * export const GET = handler.GET;
 * ```
 */

import { PLASMA_GASLESS_API } from "./relayer";

// =============================================================================
// Nonce Replay Protection
// =============================================================================

/**
 * In-memory cache of used nonces to prevent replay attacks.
 * Key: from_address:nonce
 * Value: Timestamp when this nonce was used
 *
 * Note: In production with multiple server instances, this should use Redis.
 */
const usedNonces = new Map<string, number>();

// Clean up old nonces periodically (older than 24 hours)
const NONCE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Check if a nonce has already been used (replay attack prevention).
 *
 * @param from - Sender address
 * @param nonce - The nonce value
 * @returns true if nonce was already used
 */
export function isNonceUsed(from: string, nonce: string): boolean {
  const key = `${from.toLowerCase()}:${nonce}`;
  const usedAt = usedNonces.get(key);
  if (!usedAt) return false;

  // Clean up if expired
  if (Date.now() - usedAt > NONCE_EXPIRY_MS) {
    usedNonces.delete(key);
    return false;
  }

  return true;
}

/**
 * Mark a nonce as used.
 *
 * @param from - Sender address
 * @param nonce - The nonce value
 */
function markNonceUsed(from: string, nonce: string): void {
  const key = `${from.toLowerCase()}:${nonce}`;
  usedNonces.set(key, Date.now());

  // Periodic cleanup of old nonces (keep memory bounded)
  if (usedNonces.size > 10000) {
    const now = Date.now();
    for (const [k, v] of usedNonces.entries()) {
      if (now - v > NONCE_EXPIRY_MS) usedNonces.delete(k);
    }
  }
}

// =============================================================================
// Rate Limit Tracking
// =============================================================================

/**
 * In-memory rate limit cache to prevent hammering the API after 429 responses.
 * Key: User IP or "from" address
 * Value: Timestamp when rate limit expires (Date.now() + retryAfter * 1000)
 */
const rateLimitCache = new Map<string, number>();

/**
 * Check if a user/IP is currently rate limited.
 *
 * @param key - User IP or wallet address to check
 * @returns Seconds until rate limit expires, or 0 if not limited
 */
export function getRateLimitRemaining(key: string): number {
  const expiresAt = rateLimitCache.get(key);
  if (!expiresAt) return 0;

  const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
  if (remaining <= 0) {
    // Rate limit expired, clean up
    rateLimitCache.delete(key);
    return 0;
  }
  return remaining;
}

/**
 * Set a rate limit for a user/IP.
 *
 * @param key - User IP or wallet address
 * @param retryAfterSeconds - Seconds until they can retry
 */
function setRateLimit(key: string, retryAfterSeconds: number): void {
  const expiresAt = Date.now() + retryAfterSeconds * 1000;
  rateLimitCache.set(key, expiresAt);

  // Clean up expired entries periodically (keep cache small)
  if (rateLimitCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of rateLimitCache.entries()) {
      if (v < now) rateLimitCache.delete(k);
    }
  }
}

// =============================================================================
// Types
// =============================================================================

export interface GaslessAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
}

export interface GaslessSubmitRequest {
  authorization: GaslessAuthorization;
  signature: string;
}

export interface GaslessSubmitResponse {
  id: string;
  status: "queued" | "pending" | "submitted" | "confirmed" | "failed";
  txHash?: string;
  error?: string;
}

export interface RelayHandlerConfig {
  /** Override the relayer API URL (defaults to PLASMA_GASLESS_API) */
  apiUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Minimum transfer amount in USDT0 units (default: 1000000 = 1 USDT0) */
  minAmount?: bigint;
  /** Maximum transfer amount in USDT0 units (default: 10000000000 = 10000 USDT0) */
  maxAmount?: bigint;
}

// =============================================================================
// Validation
// =============================================================================

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HEX_REGEX = /^0x[a-fA-F0-9]+$/;

export function validateAuthorization(
  auth: GaslessAuthorization,
  config: RelayHandlerConfig = {}
): { valid: boolean; error?: string } {
  // Validate addresses
  if (!ADDRESS_REGEX.test(auth.from)) {
    return { valid: false, error: "Invalid 'from' address" };
  }
  if (!ADDRESS_REGEX.test(auth.to)) {
    return { valid: false, error: "Invalid 'to' address" };
  }
  if (auth.from.toLowerCase() === auth.to.toLowerCase()) {
    return { valid: false, error: "Cannot transfer to self" };
  }

  // Validate value - wrap in try-catch to handle undefined/null/malformed strings
  let value: bigint;
  try {
    value = BigInt(auth.value);
  } catch {
    return { valid: false, error: "Invalid value format" };
  }
  const minAmount = config.minAmount ?? 1_000_000n; // 1 USDT0
  const maxAmount = config.maxAmount ?? 10_000_000_000n; // 10,000 USDT0

  if (value <= 0n) {
    return { valid: false, error: "Value must be positive" };
  }
  if (value < minAmount) {
    return { valid: false, error: `Minimum transfer is ${minAmount / 1_000_000n} USDT0` };
  }
  if (value > maxAmount) {
    return { valid: false, error: `Maximum transfer is ${maxAmount / 1_000_000n} USDT0` };
  }

  // Validate timing
  const now = Math.floor(Date.now() / 1000);
  if (auth.validAfter > now + 60) {
    return { valid: false, error: "Authorization not yet valid" };
  }
  if (auth.validBefore < now) {
    return { valid: false, error: "Authorization expired" };
  }

  // Validate nonce format
  if (!HEX_REGEX.test(auth.nonce)) {
    return { valid: false, error: "Invalid nonce format" };
  }

  return { valid: true };
}

export function validateSignature(signature: string): boolean {
  // EIP-712 signatures should be 65 bytes (130 hex chars + 0x prefix)
  return /^0x[a-fA-F0-9]{130}$/.test(signature);
}

// =============================================================================
// Handler Factory
// =============================================================================

export interface RelayHandlerResult {
  POST: (request: Request) => Promise<Response>;
  GET: (request: Request) => Promise<Response>;
}

/**
 * Create a gasless relay handler for Next.js API routes.
 *
 * @param config - Optional configuration
 * @returns Object with POST and GET handlers
 */
export function createRelayHandler(
  config: RelayHandlerConfig = {}
): RelayHandlerResult {
  const apiUrl = config.apiUrl ?? PLASMA_GASLESS_API;
  const timeout = config.timeout ?? 30000;

  async function POST(request: Request): Promise<Response> {
    const secret = process.env.PLASMA_RELAYER_SECRET;

    if (!secret) {
      console.error("PLASMA_RELAYER_SECRET not configured");
      return Response.json(
        { error: "Gasless relayer not configured" },
        { status: 503 }
      );
    }

    try {
      // Extract user IP for rate limiting
      const headers = new Headers(request.headers);
      const forwardedFor = headers.get("x-forwarded-for");
      const realIp = headers.get("x-real-ip");
      const userIP = forwardedFor?.split(",")[0].trim() || realIp || "unknown";

      // Check if IP is currently rate limited (prevents hammering)
      const ipRateLimitRemaining = getRateLimitRemaining(userIP);
      if (ipRateLimitRemaining > 0) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded - please wait before retrying",
            retryAfter: ipRateLimitRemaining,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(ipRateLimitRemaining),
            },
          }
        );
      }

      // Parse request body
      let body: GaslessSubmitRequest;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      if (!body.authorization || !body.signature) {
        return Response.json(
          { error: "Missing authorization or signature" },
          { status: 400 }
        );
      }

      // Validate authorization
      const validation = validateAuthorization(body.authorization, config);
      if (!validation.valid) {
        return Response.json({ error: validation.error }, { status: 400 });
      }

      // Validate signature format
      if (!validateSignature(body.signature)) {
        return Response.json({ error: "Invalid signature format" }, { status: 400 });
      }

      // Check for nonce replay attack
      if (isNonceUsed(body.authorization.from, body.authorization.nonce)) {
        return Response.json(
          { error: "Nonce already used - possible replay attack" },
          { status: 400 }
        );
      }

      // Forward to Plasma gasless API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${apiUrl}/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": secret,
            "X-User-IP": userIP,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting with proper Retry-After header
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          const resetsAt = errorData.error?.details?.resetsAt;
          const retryAfter = resetsAt
            ? Math.ceil((new Date(resetsAt).getTime() - Date.now()) / 1000)
            : 3600;

          // Cache the rate limit to prevent hammering
          setRateLimit(userIP, Math.max(60, retryAfter));
          if (body.authorization?.from) {
            setRateLimit(body.authorization.from.toLowerCase(), Math.max(60, retryAfter));
          }

          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded",
              details: errorData.error,
              resetsAt,
              retryAfter: Math.max(0, retryAfter),
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(Math.max(0, retryAfter)),
              },
            }
          );
        }

        // Handle other error responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return Response.json(
            { error: errorData.error || "Relay failed" },
            { status: response.status }
          );
        }

        // Success - mark nonce as used to prevent replay
        const data: GaslessSubmitResponse = await response.json();
        markNonceUsed(body.authorization.from, body.authorization.nonce);
        return Response.json(data);
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          return Response.json(
            { error: "Request timeout - please try again" },
            { status: 504 }
          );
        }
        throw err;
      }
    } catch (err) {
      console.error("Relay handler error:", err);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  async function GET(request: Request): Promise<Response> {
    const secret = process.env.PLASMA_RELAYER_SECRET;

    if (!secret) {
      return Response.json(
        { error: "Gasless relayer not configured" },
        { status: 503 }
      );
    }

    try {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return Response.json({ error: "Missing transaction id" }, { status: 400 });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${apiUrl}/status/${id}`, {
          headers: {
            "X-Internal-Secret": secret,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return Response.json(
            { error: errorData.error || "Status check failed" },
            { status: response.status }
          );
        }

        const data = await response.json();
        return Response.json(data);
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          return Response.json(
            { error: "Request timeout" },
            { status: 504 }
          );
        }
        throw err;
      }
    } catch (err) {
      console.error("Status check error:", err);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  return { POST, GET };
}

