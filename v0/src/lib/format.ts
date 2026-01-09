/**
 * Formatting Utilities
 *
 * Shared formatting functions for dates, amounts, and display values.
 * Centralized to avoid DRY violations - these were previously duplicated
 * across 3+ page components.
 */

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Format a date string into a human-readable short format.
 *
 * @param dateString - ISO date string or undefined
 * @returns Formatted date like "Jan 15, 2025" or "TBD" if invalid
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return "TBD";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string with time for prediction history.
 *
 * @param dateString - ISO date string
 * @returns Formatted date like "Jan 15, 3:45 PM" or the original string
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

// =============================================================================
// Amount Formatting
// =============================================================================

/**
 * Format a volume/liquidity value with K/M suffixes.
 *
 * @param volume - Volume in USD (or undefined)
 * @returns Formatted string like "$1.5M", "$500K", or "$0"
 */
export function formatVolume(volume?: number): string {
  if (!volume || volume <= 0) return "$0";
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

/**
 * Format a probability (0-1) as a percentage string.
 *
 * @param price - Probability between 0 and 1
 * @returns Percentage string like "65%"
 */
export function formatProbability(price: number): string {
  const clamped = Math.max(0, Math.min(1, price));
  return `${Math.round(clamped * 100)}%`;
}

/**
 * Format atomic units to display amount (USDT0 has 6 decimals).
 *
 * @param atomicAmount - Amount in atomic units
 * @param decimals - Number of decimals (default 6 for USDT0)
 * @returns Display amount as number
 */
export function atomicToDisplay(atomicAmount: number | bigint, decimals = 6): number {
  const divisor = 10 ** decimals;
  return Number(atomicAmount) / divisor;
}

/**
 * Convert display amount to atomic units safely using BigInt.
 * Avoids JavaScript floating-point precision issues.
 *
 * @param displayAmount - Amount in display units (e.g., 1.5 USDT0)
 * @param decimals - Number of decimals (default 6 for USDT0)
 * @returns Atomic amount as bigint
 */
export function displayToAtomic(displayAmount: string | number, decimals = 6): bigint {
  // Parse the input as a string to handle decimal precision
  const amountStr = String(displayAmount);
  const parts = amountStr.split(".");

  const wholePart = parts[0] || "0";
  let fracPart = parts[1] || "";

  // Pad or truncate fractional part to match decimals
  if (fracPart.length > decimals) {
    fracPart = fracPart.slice(0, decimals);
  } else {
    fracPart = fracPart.padEnd(decimals, "0");
  }

  // Combine and parse as BigInt (no floating point involved)
  const combined = wholePart + fracPart;
  return BigInt(combined);
}

// =============================================================================
// Status Colors
// =============================================================================

export interface StatusColors {
  bg: string;
  text: string;
  border: string;
}

/**
 * Get colors for a prediction status badge.
 *
 * @param status - Prediction status (active, won, lost, etc.)
 * @returns Object with bg, text, and border colors
 */
export function getStatusColors(status: string): StatusColors {
  switch (status.toLowerCase()) {
    case "active":
    case "pending":
      return {
        bg: "rgba(59, 130, 246, 0.1)",
        text: "#3b82f6",
        border: "rgba(59, 130, 246, 0.3)",
      };
    case "won":
    case "resolved":
      return {
        bg: "rgba(16, 185, 129, 0.1)",
        text: "#10b981",
        border: "rgba(16, 185, 129, 0.3)",
      };
    case "lost":
    case "failed":
      return {
        bg: "rgba(239, 68, 68, 0.1)",
        text: "#ef4444",
        border: "rgba(239, 68, 68, 0.3)",
      };
    default:
      return {
        bg: "rgba(127, 127, 127, 0.1)",
        text: "#6b7280",
        border: "rgba(127, 127, 127, 0.3)",
      };
  }
}

