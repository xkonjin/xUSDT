/**
 * Simplify API Logic Tests
 * 
 * Unit tests for the debt simplification API logic.
 * Tests the underlying logic that powers the /api/simplify endpoint.
 * TDD: Tests written first, before implementation.
 */

import { simplifyDebts, Debt } from '../simplify-debts';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Simulates the debt extraction logic from the API endpoint.
 * This mirrors what happens in /api/simplify/route.ts
 */
function extractDebtsFromBills(
  bills: MockBill[],
  userAddress: string,
  userEmail?: string
): Debt[] {
  const normalizedAddress = userAddress.toLowerCase();
  const normalizedEmail = userEmail?.toLowerCase().trim();
  const debts: Debt[] = [];

  for (const bill of bills) {
    const isCreator = bill.creatorAddress.toLowerCase() === normalizedAddress;

    for (const participant of bill.participants) {
      if (participant.paid) continue;

      const participantEmail = participant.email?.toLowerCase().trim();
      const isParticipantMe = participantEmail && normalizedEmail && 
        participantEmail === normalizedEmail;

      if (isCreator) {
        // I created this bill - participants owe me (except myself)
        if (!isParticipantMe) {
          debts.push({
            debtor: participant.name,
            creditor: 'You',
            amount: participant.share,
          });
        }
      } else if (isParticipantMe) {
        // Someone else created this bill - I owe them
        debts.push({
          debtor: 'You',
          creditor: bill.creatorAddress,
          amount: participant.share,
        });
      }
    }
  }

  return debts;
}

interface MockBill {
  id: string;
  creatorAddress: string;
  total: number;
  participants: Array<{
    id: string;
    name: string;
    email?: string | null;
    share: number;
    paid: boolean;
  }>;
}

const createMockBill = (overrides: Partial<MockBill> & Pick<MockBill, 'id'>): MockBill => ({
  creatorAddress: '0xCreator',
  total: 100,
  participants: [],
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('Simplify API Logic', () => {
  describe('Debt Extraction', () => {
    it('should extract empty debts for user with no bills', () => {
      const debts = extractDebtsFromBills([], '0xUser');
      expect(debts).toEqual([]);
    });

    it('should extract debts for bills created by user', () => {
      const mockBills: MockBill[] = [
        createMockBill({
          id: 'bill-1',
          creatorAddress: '0xUser',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 50, paid: false },
            { id: 'p2', name: 'Bob', email: 'bob@test.com', share: 50, paid: false },
          ],
        }),
      ];

      const debts = extractDebtsFromBills(mockBills, '0xUser');
      
      expect(debts).toHaveLength(2);
      expect(debts).toContainEqual({ debtor: 'Alice', creditor: 'You', amount: 50 });
      expect(debts).toContainEqual({ debtor: 'Bob', creditor: 'You', amount: 50 });
    });

    it('should exclude already paid debts', () => {
      const mockBills: MockBill[] = [
        createMockBill({
          id: 'bill-1',
          creatorAddress: '0xUser',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', share: 50, paid: true }, // Already paid
            { id: 'p2', name: 'Bob', share: 50, paid: false },
          ],
        }),
      ];

      const debts = extractDebtsFromBills(mockBills, '0xUser');
      
      expect(debts).toHaveLength(1);
      expect(debts[0]).toEqual({ debtor: 'Bob', creditor: 'You', amount: 50 });
    });

    it('should extract debts user owes to bill creators', () => {
      const mockBills: MockBill[] = [
        createMockBill({
          id: 'bill-1',
          creatorAddress: '0xAlice',
          total: 100,
          participants: [
            { id: 'p1', name: 'Me', email: 'me@test.com', share: 100, paid: false },
          ],
        }),
      ];

      const debts = extractDebtsFromBills(mockBills, '0xUser', 'me@test.com');
      
      expect(debts).toHaveLength(1);
      expect(debts[0]).toEqual({ debtor: 'You', creditor: '0xAlice', amount: 100 });
    });
  });

  describe('API Response Format', () => {
    it('should return properly formatted simplification result', () => {
      const debts: Debt[] = [
        { debtor: 'Alice', creditor: 'You', amount: 50 },
        { debtor: 'Bob', creditor: 'You', amount: 50 },
      ];

      const result = simplifyDebts(debts);

      // Verify structure
      expect(result).toHaveProperty('simplifiedPayments');
      expect(result).toHaveProperty('originalCount');
      expect(result).toHaveProperty('simplifiedCount');
      expect(result).toHaveProperty('savingsCount');
      expect(result).toHaveProperty('savingsMessage');
      expect(Array.isArray(result.simplifiedPayments)).toBe(true);

      // Verify types
      expect(typeof result.originalCount).toBe('number');
      expect(typeof result.simplifiedCount).toBe('number');
    });

    it('should include metadata for savings', () => {
      const debts: Debt[] = [
        { debtor: 'Alice', creditor: 'You', amount: 50 },
        { debtor: 'Bob', creditor: 'You', amount: 50 },
      ];

      const result = simplifyDebts(debts);
      
      expect(result.originalCount).toBe(2);
      expect(result.simplifiedCount).toBe(2);
      expect(result.savingsCount).toBe(0);
    });
  });

  describe('Full Integration Scenarios', () => {
    it('should handle multiple bills and consolidate debts', () => {
      const mockBills: MockBill[] = [
        createMockBill({
          id: 'bill-1',
          creatorAddress: '0xUser',
          total: 60,
          participants: [
            { id: 'p1', name: 'Alice', share: 30, paid: false },
            { id: 'p2', name: 'Bob', share: 30, paid: false },
          ],
        }),
        createMockBill({
          id: 'bill-2',
          creatorAddress: '0xUser',
          total: 40,
          participants: [
            { id: 'p3', name: 'Alice', email: 'alice@test.com', share: 40, paid: false },
          ],
        }),
      ];

      const debts = extractDebtsFromBills(mockBills, '0xUser');
      const result = simplifyDebts(debts);
      
      // Alice owes $30 + $40 = $70, Bob owes $30
      // Original: 3 payments, Simplified: 2 payments
      expect(result.originalCount).toBe(3);
      expect(result.simplifiedCount).toBe(2);
      
      const alicePayment = result.simplifiedPayments.find(p => 
        p.from.toLowerCase() === 'alice'
      );
      const bobPayment = result.simplifiedPayments.find(p => 
        p.from.toLowerCase() === 'bob'
      );
      expect(alicePayment?.amount).toBe(70);
      expect(bobPayment?.amount).toBe(30);
    });

    it('should simplify cross-debts when user owes and is owed (same person)', () => {
      // When Bob owes user and user also owes Bob, they should net out
      // This requires both debts to reference the same identifier
      const mockBills: MockBill[] = [
        // User created this bill - Bob (as name "Bob") owes them $100
        createMockBill({
          id: 'bill-1',
          creatorAddress: '0xUser',
          total: 100,
          participants: [
            { id: 'p1', name: 'Bob', email: 'bob@test.com', share: 100, paid: false },
          ],
        }),
      ];

      // Simulate user also owing Bob directly (same name)
      const debts = extractDebtsFromBills(mockBills, '0xUser');
      // Add a debt where user owes Bob (using same name for simplification)
      debts.push({ debtor: 'You', creditor: 'Bob', amount: 40 });
      
      const result = simplifyDebts(debts);
      
      // Net: Bob owes User $60 (100 - 40)
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0].amount).toBe(60);
      expect(result.simplifiedPayments[0].from).toBe('Bob');
      expect(result.simplifiedPayments[0].to).toBe('You');
      expect(result.originalCount).toBe(2);
      expect(result.simplifiedCount).toBe(1);
      expect(result.savingsCount).toBe(1);
    });

    it('should handle cross-debts with different identifiers separately', () => {
      // When Alice (name) and 0xAlice (address) can't be linked, they're separate
      const mockBills: MockBill[] = [
        // User created this bill - Alice (name) owes them $100
        createMockBill({
          id: 'bill-1',
          creatorAddress: '0xUser',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 100, paid: false },
          ],
        }),
        // 0xAlice (address) created this bill - User owes them $40
        createMockBill({
          id: 'bill-2',
          creatorAddress: '0xAlice',
          total: 40,
          participants: [
            { id: 'p2', name: 'User', email: 'user@test.com', share: 40, paid: false },
          ],
        }),
      ];

      const debts = extractDebtsFromBills(mockBills, '0xUser', 'user@test.com');
      const result = simplifyDebts(debts);
      
      // Without identity linking: Alice (name) and 0xAlice (address) are different people
      // So we have 2 separate payments
      expect(result.simplifiedPayments).toHaveLength(2);
      expect(result.originalCount).toBe(2);
      expect(result.simplifiedCount).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal amounts', () => {
      const debts: Debt[] = [
        { debtor: 'Alice', creditor: 'You', amount: 33.33 },
        { debtor: 'Bob', creditor: 'You', amount: 16.67 },
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(2);
      const alicePayment = result.simplifiedPayments.find(p => p.from === 'Alice');
      expect(alicePayment?.amount).toBeCloseTo(33.33, 2);
    });

    it('should handle very large amounts', () => {
      const debts: Debt[] = [
        { debtor: 'BigSpender', creditor: 'You', amount: 999999.99 },
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments[0].amount).toBe(999999.99);
    });

    it('should handle null emails gracefully', () => {
      const mockBills: MockBill[] = [
        createMockBill({
          id: 'bill-1',
          creatorAddress: '0xUser',
          total: 50,
          participants: [
            { id: 'p1', name: 'NoEmail', email: null, share: 50, paid: false },
          ],
        }),
      ];

      const debts = extractDebtsFromBills(mockBills, '0xUser');
      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0].from).toBe('NoEmail');
    });
  });
});
