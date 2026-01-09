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

  // Validate value
  const value = BigInt(auth.value);
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

          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded",
              details: errorData.error,
              resetsAt,
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

        // Success
        const data: GaslessSubmitResponse = await response.json();
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

