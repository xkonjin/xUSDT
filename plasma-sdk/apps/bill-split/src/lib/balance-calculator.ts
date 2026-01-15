/**
 * Balance Calculator Module
 * 
 * Calculates user balances across all bills:
 * - Total owed to user (from bills they created)
 * - Total user owes (from bills they participate in)
 * - Net balance per person
 */

// =============================================================================
// Types
// =============================================================================

export interface BillParticipant {
  id: string;
  name: string;
  email?: string | null;
  share: number;
  paid: boolean;
}

export interface Bill {
  id: string;
  creatorAddress: string;
  participants: BillParticipant[];
  total: number;
}

export interface BalanceSummary {
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  balances: PersonBalance[];
}

export interface PersonBalance {
  name: string;
  email?: string | null;
  address?: string;
  amount: number;
  direction: 'owes_me' | 'i_owe';
  bills: string[]; // bill IDs involved
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
 * Normalize email for comparison (lowercase, trim).
 */
function normalizeEmail(email: string | null | undefined): string | null {
  return email?.toLowerCase().trim() || null;
}

/**
 * Normalize address for comparison (lowercase).
 */
function normalizeAddress(address: string | null | undefined): string | null {
  return address?.toLowerCase() || null;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Calculate net balance between two amounts.
 * 
 * @param owedToMe - Total amount owed to user
 * @param iOwe - Total amount user owes
 * @returns Positive if net owed to user, negative if user owes
 */
export function calculateNetBalance(owedToMe: number, iOwe: number): number {
  return roundCurrency(owedToMe - iOwe);
}

/**
 * PersonDebt tracks what a specific person owes/is owed.
 */
interface PersonDebt {
  name: string;
  email?: string | null;
  address?: string;
  owesMe: number;
  iOwe: number;
  bills: Set<string>;
}

/**
 * PersonIdentity helps merge people who appear with different identifiers.
 */
interface PersonIdentity {
  emails: Set<string>;
  addresses: Set<string>;
  names: Set<string>;
  debt: PersonDebt;
}

/**
 * Find or create a person identity that matches the given identifiers.
 * This allows merging Alice from one bill (email) with Alice from another (address).
 */
function findOrCreatePerson(
  people: PersonIdentity[],
  email?: string | null,
  address?: string,
  name?: string
): PersonIdentity {
  const normalizedEmail = normalizeEmail(email);
  const normalizedAddr = normalizeAddress(address);
  const normalizedName = name?.toLowerCase().trim();

  // Look for a matching person
  for (const person of people) {
    // Match by email
    if (normalizedEmail && person.emails.has(normalizedEmail)) {
      // Add any new identifiers
      if (normalizedAddr) person.addresses.add(normalizedAddr);
      if (normalizedName) person.names.add(normalizedName);
      return person;
    }
    // Match by address
    if (normalizedAddr && person.addresses.has(normalizedAddr)) {
      // Add any new identifiers
      if (normalizedEmail) person.emails.add(normalizedEmail);
      if (normalizedName) person.names.add(normalizedName);
      return person;
    }
  }

  // Create new person identity
  const newPerson: PersonIdentity = {
    emails: new Set(normalizedEmail ? [normalizedEmail] : []),
    addresses: new Set(normalizedAddr ? [normalizedAddr] : []),
    names: new Set(normalizedName ? [normalizedName] : []),
    debt: {
      name: name || 'Unknown',
      email: email,
      address: address,
      owesMe: 0,
      iOwe: 0,
      bills: new Set(),
    },
  };
  people.push(newPerson);
  return newPerson;
}

/**
 * Calculate complete balance summary for a user.
 * 
 * @param userAddress - User's wallet address
 * @param bills - All bills to analyze
 * @param userEmail - User's email (for matching as participant)
 * @returns Balance summary with totals and per-person breakdown
 */
export function calculateBalances(
  userAddress: string,
  bills: Bill[],
  userEmail?: string
): BalanceSummary {
  if (bills.length === 0) {
    return {
      totalOwedToMe: 0,
      totalIOwe: 0,
      netBalance: 0,
      balances: [],
    };
  }

  let totalOwedToMe = 0;
  let totalIOwe = 0;
  const normalizedUserEmail = normalizeEmail(userEmail);
  const normalizedUserAddress = normalizeAddress(userAddress);

  // Track debts per person with identity merging
  const people: PersonIdentity[] = [];

  for (const bill of bills) {
    const isCreator = normalizeAddress(bill.creatorAddress) === normalizedUserAddress;

    for (const participant of bill.participants) {
      const participantEmail = normalizeEmail(participant.email);
      const isMe = participantEmail && normalizedUserEmail && 
        participantEmail === normalizedUserEmail;

      if (isCreator) {
        // I created this bill - participants owe me (except myself)
        if (!participant.paid && !isMe) {
          totalOwedToMe += participant.share;

          const person = findOrCreatePerson(
            people,
            participant.email,
            undefined, // Participants don't have addresses in this context
            participant.name
          );
          person.debt.owesMe += participant.share;
          person.debt.bills.add(bill.id);
          // Update display info if better available
          if (participant.email) person.debt.email = participant.email;
          if (participant.name) person.debt.name = participant.name;
        }
      } else if (isMe) {
        // Someone else created this bill and I'm a participant - I owe them
        if (!participant.paid) {
          totalIOwe += participant.share;

          // Track what I owe to the bill creator
          const person = findOrCreatePerson(
            people,
            undefined, // Creator doesn't have email in this context
            bill.creatorAddress,
            undefined
          );
          person.debt.iOwe += participant.share;
          person.debt.bills.add(bill.id);
          person.debt.address = bill.creatorAddress;
        }
      }
    }
  }

  // Convert to balances array with net amounts
  const balances: PersonBalance[] = [];
  
  for (const person of people) {
    const netAmount = person.debt.owesMe - person.debt.iOwe;
    
    if (netAmount === 0) continue; // Skip settled balances

    balances.push({
      name: person.debt.name,
      email: person.debt.email,
      address: person.debt.address,
      amount: Math.abs(netAmount),
      direction: netAmount > 0 ? 'owes_me' : 'i_owe',
      bills: Array.from(person.debt.bills),
    });
  }

  // Sort by amount descending
  balances.sort((a, b) => b.amount - a.amount);

  return {
    totalOwedToMe: roundCurrency(totalOwedToMe),
    totalIOwe: roundCurrency(totalIOwe),
    netBalance: calculateNetBalance(totalOwedToMe, totalIOwe),
    balances,
  };
}

/**
 * Group balances by person for display.
 * 
 * @param userAddress - User's wallet address
 * @param bills - All bills to analyze
 * @param userEmail - User's email (for matching as participant)
 * @returns Array of person balances, sorted by amount
 */
export function groupBalancesByPerson(
  userAddress: string,
  bills: Bill[],
  userEmail?: string
): PersonBalance[] {
  const summary = calculateBalances(userAddress, bills, userEmail);
  return summary.balances;
}
