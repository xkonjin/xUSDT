import { getUserFriendlyError as getBaseError } from "@plasma-pay/ui";

export function getUserFriendlyError(error: unknown): string {
  const errorMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as Record<string, unknown>).message === "string"
      ? ((error as Record<string, unknown>).message as string)
      : typeof error === "object" &&
        error !== null &&
        "error" in error &&
        typeof (error as Record<string, unknown>).error === "string"
      ? ((error as Record<string, unknown>).error as string)
      : "Unknown error";

  const lower = errorMessage.toLowerCase();

  if (
    lower.includes("erc20: transfer amount exceeds balance") ||
    lower.includes("exceeds balance")
  ) {
    return "Insufficient balance. Please add funds to continue.";
  }

  if (
    lower.includes("empty or invalid response from server") ||
    lower.includes("empty response") ||
    lower.includes("invalid response")
  ) {
    return "Something went wrong. Please try again.";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("connection")
  ) {
    return "Network issue. Check your connection and try again.";
  }

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("denied transaction") ||
    lower.includes("rejected")
  ) {
    return "Transaction cancelled.";
  }

  if (lower.includes("deadline")) {
    return "Transaction expired. Please try again.";
  }

  if (lower.includes("nonce")) {
    return "Transaction conflict. Please wait a moment and try again.";
  }

  if (lower.includes("not found")) {
    return "Recipient not found. Check the address or email and try again.";
  }

  return getBaseError(error);
}
