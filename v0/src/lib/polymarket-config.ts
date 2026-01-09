/**
 * Polymarket Configuration
 *
 * Centralized configuration for Polymarket integration.
 * Single source of truth for backend URLs and mock settings.
 *
 * This prevents DRY violations - previously BACKEND_URL was
 * defined in 4 separate API route files.
 */

// =============================================================================
// Feature Flags
// =============================================================================

/**
 * Whether Polymarket integration is enabled.
 * Set NEXT_PUBLIC_ENABLE_POLYMARKET=false to disable.
 * Defaults to true if not set.
 */
export const POLYMARKET_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_POLYMARKET !== "false";

// =============================================================================
// Backend API Configuration
// =============================================================================

/**
 * Backend URL for the FastAPI merchant service.
 *
 * Checks multiple environment variables for flexibility:
 * - POLYMARKET_BACKEND_URL: Polymarket-specific override
 * - MERCHANT_URL: General backend URL (server-side)
 * - NEXT_PUBLIC_MERCHANT_URL: Public backend URL (client-side)
 * - Falls back to localhost:8000 for local development
 */
export const BACKEND_URL =
  process.env.POLYMARKET_BACKEND_URL ||
  process.env.MERCHANT_URL ||
  process.env.NEXT_PUBLIC_MERCHANT_URL ||
  "http://127.0.0.1:8000";

/**
 * Get the full backend API URL for a given endpoint.
 * Handles trailing slash normalization.
 *
 * @param endpoint - API endpoint path (e.g., "/polymarket/markets")
 * @returns Full URL to the backend endpoint
 */
export function getBackendUrl(endpoint: string): string {
  const base = BACKEND_URL.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

// =============================================================================
// Mock/Demo Configuration
// =============================================================================

/**
 * Whether the app is running in demo/mock mode.
 * Controlled by NEXT_PUBLIC_POLYMARKET_DEMO_MODE environment variable.
 * When true, uses mock wallet and shows demo notices.
 *
 * IMPORTANT: Set to false in production!
 */
export const IS_DEMO_MODE =
  process.env.NEXT_PUBLIC_POLYMARKET_DEMO_MODE === "true" ||
  process.env.NODE_ENV === "development";

/**
 * Mock wallet address for demo mode.
 *
 * In production, this would come from wallet connection (MetaMask, etc.).
 * Centralized here to avoid hardcoding in multiple components.
 *
 * WARNING: Will throw an error if used in production mode.
 */
export function getMockWalletAddress(): string {
  if (!IS_DEMO_MODE && process.env.NODE_ENV === "production") {
    throw new Error(
      "SECURITY: Mock wallet address accessed in production mode. " +
        "Connect a real wallet instead."
    );
  }
  return "0x742d35Cc6634C0532925a3b844Bc9e7595f00000";
}

/**
 * @deprecated Use getMockWalletAddress() which includes production check.
 */
export const MOCK_WALLET_ADDRESS = IS_DEMO_MODE
  ? "0x742d35Cc6634C0532925a3b844Bc9e7595f00000"
  : (() => {
      if (process.env.NODE_ENV === "production") {
        console.warn(
          "WARNING: MOCK_WALLET_ADDRESS accessed - should use real wallet in production"
        );
      }
      return "0x742d35Cc6634C0532925a3b844Bc9e7595f00000";
    })();

// =============================================================================
// API Timeout Configuration
// =============================================================================

/**
 * Default timeout for API requests in milliseconds.
 */
export const API_TIMEOUT_MS = 30_000;

// =============================================================================
// Amount Configuration
// =============================================================================

/**
 * Number of decimal places for USDT0 token.
 * Used for converting between atomic and display amounts.
 */
export const USDT0_DECIMALS = 6;

/**
 * Minimum bet amount in atomic units (0.001 USDT0 = 1000 atomic)
 */
export const MIN_BET_AMOUNT_ATOMIC = 1000;

/**
 * Minimum bet amount in display units
 */
export const MIN_BET_AMOUNT_DISPLAY = 0.001;

