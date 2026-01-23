/**
 * Form validation utilities
 */

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validate amount against balance
 */
export function validateAmount(
  amount: string,
  balance?: bigint,
  decimals: number = 6
): ValidationResult {
  // Check if amount is empty
  if (!amount || amount.trim() === "") {
    return { valid: false, error: "Amount is required" };
  }

  // Check if amount is a valid number
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return { valid: false, error: "Amount must be a valid number" };
  }

  // Check if amount is positive
  if (numAmount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  // Convert to atomic units
  const atomic = toAtomic(amount, decimals);

  // Check against balance if provided
  if (balance !== undefined && atomic > balance) {
    const formattedBalance = fromAtomic(balance, decimals);
    return { 
      valid: false, 
      error: `Insufficient balance. You have ${formattedBalance} USDT0` 
    };
  }

  return { valid: true };
}

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.trim() === "") {
    return { valid: false, error: "Address is required" };
  }

  // Basic Ethereum address format check
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(address)) {
    return { valid: false, error: "Invalid Ethereum address format" };
  }

  // TODO: Add checksum validation
  return { valid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === "") {
    return { valid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

/**
 * Convert decimal amount to atomic units
 */
export function toAtomic(amountDecimal: string, decimals: number = 6): bigint {
  const [integer, fraction = ""] = amountDecimal.trim().split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const atomicString = `${integer || "0"}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  return BigInt(atomicString.length ? atomicString : "0");
}

/**
 * Convert atomic units to decimal amount
 */
export function fromAtomic(atomic: bigint, decimals: number = 6): string {
  const atomicString = atomic.toString().padStart(decimals + 1, "0");
  const integerPart = atomicString.slice(0, -decimals) || "0";
  const fractionalPart = atomicString.slice(-decimals);
  return `${integerPart}.${fractionalPart}`;
}

/**
 * Format amount for display
 */
export function formatAmount(amount: string | bigint, decimals: number = 6): string {
  const amountStr = typeof amount === "bigint" ? fromAtomic(amount, decimals) : amount;
  const num = parseFloat(amountStr);
  
  if (isNaN(num)) return "0.00";
  
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}
