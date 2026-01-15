import { isAddress } from 'viem';

export function validateEthereumAddress(address: string): { valid: boolean; error?: string } {
  if (!address) {
    return { valid: false, error: 'Address is required' };
  }
  if (!isAddress(address)) {
    return { valid: false, error: 'Invalid Ethereum address format' };
  }
  return { valid: true };
}

export function validateBetAmount(amount: number, balance: number): { valid: boolean; error?: string } {
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (amount < 1) {
    return { valid: false, error: 'Minimum bet is $1' };
  }
  if (amount > 1_000_000) {
    return { valid: false, error: 'Maximum bet is $1,000,000' };
  }
  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }
  return { valid: true };
}

export function validateMarketId(marketId: string): { valid: boolean; error?: string } {
  if (!marketId) {
    return { valid: false, error: 'Market ID is required' };
  }
  // Allow alphanumeric, hyphens, and underscores only
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(marketId)) {
    return { valid: false, error: 'Invalid market ID format' };
  }
  if (marketId.length > 255) {
    return { valid: false, error: 'Market ID too long' };
  }
  return { valid: true };
}

export function validateOutcome(outcome: string): { valid: boolean; error?: string } {
  const validOutcomes = ['YES', 'NO', 'Yes', 'No', 'yes', 'no'];
  if (!validOutcomes.includes(outcome)) {
    return { valid: false, error: 'Outcome must be YES or NO' };
  }
  return { valid: true };
}

export function sanitizeSearchQuery(query: string): string {
  // Remove potentially dangerous characters, keep alphanumeric and basic punctuation
  return query.replace(/[<>{}[\]\\]/g, '').trim().slice(0, 200);
}
