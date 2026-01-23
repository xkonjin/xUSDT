/**
 * User-friendly error messages
 * Maps technical errors to human-readable messages with actionable guidance
 */

export function getUserFriendlyError(error: unknown): string {
  const errorMessage = typeof error === "object" && error && "message" in error 
    ? String((error as { message?: unknown }).message) 
    : String(error);

  const lowerError = errorMessage.toLowerCase();

  // Wallet errors
  if (lowerError.includes("user rejected") || lowerError.includes("user denied")) {
    return "Transaction cancelled. Please try again when ready.";
  }

  if (lowerError.includes("wallet not found") || lowerError.includes("no wallet")) {
    return "No wallet detected. Please install MetaMask or another Web3 wallet.";
  }

  // Balance errors
  if (lowerError.includes("insufficient") || lowerError.includes("exceeds balance")) {
    return "Insufficient balance. Please add funds to continue.";
  }

  // Network errors
  if (lowerError.includes("network") || lowerError.includes("connection")) {
    return "Network connection lost. Please check your internet and try again.";
  }

  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return "Request timed out. Please try again.";
  }

  // Contract errors
  if (lowerError.includes("revert") || lowerError.includes("execution reverted")) {
    return "Transaction failed. Please check your balance and try again.";
  }

  // Server errors
  if (lowerError.includes("empty or invalid response")) {
    return "Server error. Please try again in a moment.";
  }

  if (lowerError.includes("402") || lowerError.includes("payment required")) {
    return "Payment authorization required. Please complete the payment flow.";
  }

  // Gas errors
  if (lowerError.includes("gas") || lowerError.includes("out of gas")) {
    return "Transaction requires more gas. Please try again.";
  }

  // Deadline errors
  if (lowerError.includes("deadline") || lowerError.includes("expired")) {
    return "Payment authorization expired. Please request a new payment.";
  }

  // Generic fallback with some context
  if (lowerError.includes("error")) {
    return "Something went wrong. Please try again or contact support.";
  }

  // If we can't parse it, return a generic message
  return "Transaction failed. Please try again or contact support.";
}

export function getErrorAction(error: unknown): string | null {
  const errorMessage = typeof error === "object" && error && "message" in error 
    ? String((error as { message?: unknown }).message) 
    : String(error);

  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes("insufficient") || lowerError.includes("exceeds balance")) {
    return "Add Funds";
  }

  if (lowerError.includes("wallet not found")) {
    return "Install Wallet";
  }

  if (lowerError.includes("network") || lowerError.includes("timeout")) {
    return "Retry";
  }

  return null;
}
