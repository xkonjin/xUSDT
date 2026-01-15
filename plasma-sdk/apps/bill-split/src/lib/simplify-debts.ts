/**
 * Simplify Debts Algorithm
 * 
 * Minimizes the number of payments needed to settle debts in a group.
 * Uses net balance calculation to reduce multiple transactions to fewer ones.
 * 
 * Algorithm:
 * 1. Calculate net position for each person (sum of all debts owed minus all debts to pay)
 * 2. Separate into debtors (negative balance) and creditors (positive balance)
 * 3. Match debtors with creditors to settle debts with minimum transactions
 */

// =============================================================================
// Types
// =============================================================================

/**
 * A debt from one party to another.
 */
export interface Debt {
  debtor: string;    // Person who owes money
  creditor: string;  // Person who is owed money
  amount: number;    // Amount owed
}

/**
 * A simplified payment instruction.
 */
export interface SimplifiedPayment {
  from: string;
  to: string;
  amount: number;
}

/**
 * Result of debt simplification.
 */
export interface SimplificationResult {
  simplifiedPayments: SimplifiedPayment[];
  originalCount: number;
  simplifiedCount: number;
  savingsCount: number;
  savingsMessage: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Round to 2 decimal places for currency.
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Normalize name for comparison (lowercase, trim).
 */
function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

// =============================================================================
// Main Algorithm
// =============================================================================

/**
 * Simplify a list of debts to minimize the number of payments.
 * 
 * @param debts - List of individual debts
 * @returns Simplified payment plan with metadata
 */
export function simplifyDebts(debts: Debt[]): SimplificationResult {
  // Empty input case
  if (debts.length === 0) {
    return {
      simplifiedPayments: [],
      originalCount: 0,
      simplifiedCount: 0,
      savingsCount: 0,
      savingsMessage: 'No debts to simplify',
    };
  }

  const originalCount = debts.length;

  // Track original name casing (use first occurrence)
  const originalNames = new Map<string, string>();

  // Calculate net position for each person
  // Positive = owed money (creditor)
  // Negative = owes money (debtor)
  const netPositions = new Map<string, number>();

  for (const debt of debts) {
    const normalizedDebtor = normalizeName(debt.debtor);
    const normalizedCreditor = normalizeName(debt.creditor);

    // Skip self-debts
    if (normalizedDebtor === normalizedCreditor) {
      continue;
    }

    // Skip zero amounts
    if (debt.amount === 0) {
      continue;
    }

    // Store original casing
    if (!originalNames.has(normalizedDebtor)) {
      originalNames.set(normalizedDebtor, debt.debtor);
    }
    if (!originalNames.has(normalizedCreditor)) {
      originalNames.set(normalizedCreditor, debt.creditor);
    }

    // Handle negative amounts (reverse the direction)
    let effectiveAmount = debt.amount;
    let effectiveDebtor = normalizedDebtor;
    let effectiveCreditor = normalizedCreditor;

    if (effectiveAmount < 0) {
      effectiveAmount = -effectiveAmount;
      // Swap: if Alice owes Bob -$50, that means Bob owes Alice $50
      [effectiveDebtor, effectiveCreditor] = [effectiveCreditor, effectiveDebtor];
    }

    // Update net positions
    // Debtor loses money (negative)
    netPositions.set(
      effectiveDebtor,
      (netPositions.get(effectiveDebtor) || 0) - effectiveAmount
    );
    // Creditor gains money (positive)
    netPositions.set(
      effectiveCreditor,
      (netPositions.get(effectiveCreditor) || 0) + effectiveAmount
    );
  }

  // Separate into debtors and creditors
  const debtors: Array<{ name: string; amount: number }> = [];
  const creditors: Array<{ name: string; amount: number }> = [];

  for (const [name, balance] of netPositions.entries()) {
    const rounded = roundCurrency(balance);
    if (rounded < -0.005) {
      debtors.push({ name, amount: Math.abs(rounded) });
    } else if (rounded > 0.005) {
      creditors.push({ name, amount: rounded });
    }
    // Skip people with ~zero net balance
  }

  // Sort by amount descending for optimal matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // Match debtors with creditors
  const simplifiedPayments: SimplifiedPayment[] = [];
  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    // Calculate payment amount (minimum of what debtor owes and creditor is owed)
    const paymentAmount = roundCurrency(Math.min(debtor.amount, creditor.amount));

    if (paymentAmount > 0.005) {
      simplifiedPayments.push({
        from: originalNames.get(debtor.name) || debtor.name,
        to: originalNames.get(creditor.name) || creditor.name,
        amount: paymentAmount,
      });
    }

    // Update remaining amounts
    debtor.amount = roundCurrency(debtor.amount - paymentAmount);
    creditor.amount = roundCurrency(creditor.amount - paymentAmount);

    // Move to next person if fully settled
    if (debtor.amount < 0.005) {
      debtorIdx++;
    }
    if (creditor.amount < 0.005) {
      creditorIdx++;
    }
  }

  const simplifiedCount = simplifiedPayments.length;
  const savingsCount = originalCount - simplifiedCount;

  const savingsMessage = savingsCount > 0
    ? `${simplifiedCount} payment${simplifiedCount !== 1 ? 's' : ''} instead of ${originalCount}`
    : 'No simplification possible';

  return {
    simplifiedPayments,
    originalCount,
    simplifiedCount,
    savingsCount,
    savingsMessage,
  };
}
