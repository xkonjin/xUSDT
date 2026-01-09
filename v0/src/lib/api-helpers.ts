/**
 * API Helper Utilities
 *
 * Shared helpers for API route handlers.
 * Eliminates DRY violations from repeated error handling patterns.
 */

import { NextResponse } from "next/server";
import { getBackendUrl } from "./polymarket-config";

// =============================================================================
// Types
// =============================================================================

export interface ApiError {
  error: string;
  detail?: string;
  hint?: string;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Parse an error response body, handling both JSON and text responses.
 *
 * @param response - Fetch Response object
 * @returns Parsed error body
 */
export async function parseErrorResponse(response: Response): Promise<unknown> {
  const errorText = await response.text();
  try {
    return JSON.parse(errorText);
  } catch {
    return { detail: errorText || "Unknown error occurred" };
  }
}

/**
 * Create a standardized error response.
 *
 * @param error - Error object or message
 * @param status - HTTP status code (default 500)
 * @param hint - Optional hint for debugging
 * @returns NextResponse with error body
 */
export function errorResponse(
  error: unknown,
  status = 500,
  hint?: string
): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  const body: ApiError = { error: message };
  if (hint) body.hint = hint;
  return NextResponse.json(body, { status });
}

// =============================================================================
// Proxy Helpers
// =============================================================================

/**
 * Proxy a GET request to the backend API.
 *
 * Handles error responses and connection failures gracefully.
 *
 * @param endpoint - Backend API endpoint (e.g., "/polymarket/markets")
 * @param searchParams - Optional URL search params to forward
 * @returns NextResponse with backend data or error
 */
export async function proxyGet(
  endpoint: string,
  searchParams?: URLSearchParams
): Promise<NextResponse> {
  try {
    const url = new URL(getBackendUrl(endpoint));

    // Forward search params if provided
    if (searchParams) {
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorBody = await parseErrorResponse(response);
      return NextResponse.json(errorBody, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Proxy GET ${endpoint} failed:`, error);
    return errorResponse(
      error,
      502,
      "Check if the backend server is running"
    );
  }
}

/**
 * Proxy a POST request to the backend API.
 *
 * @param endpoint - Backend API endpoint
 * @param body - Request body to forward
 * @returns NextResponse with backend data or error
 */
export async function proxyPost(
  endpoint: string,
  body: unknown
): Promise<NextResponse> {
  try {
    const url = getBackendUrl(endpoint);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy POST ${endpoint} failed:`, error);
    return errorResponse(
      error,
      502,
      "Check if the backend server is running"
    );
  }
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate an Ethereum wallet address format.
 *
 * Note: This only checks format, not checksum validity.
 * In production, use ethers.js or viem for proper validation.
 *
 * @param address - Address to validate
 * @returns True if valid format
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address) return false;
  // Check format: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a bet amount is within acceptable range.
 *
 * @param amount - Amount in atomic units
 * @param minAtomic - Minimum amount (default 1000 = 0.001 USDT0)
 * @returns True if valid
 */
export function isValidBetAmount(amount: number, minAtomic = 1000): boolean {
  return Number.isInteger(amount) && amount >= minAtomic;
}

