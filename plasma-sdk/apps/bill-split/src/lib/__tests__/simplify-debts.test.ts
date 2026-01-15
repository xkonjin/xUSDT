/**
 * Simplify Debts Algorithm Tests
 * 
 * Tests for debt simplification that minimizes number of payments.
 * TDD: Tests written first, before implementation.
 */

import {
  simplifyDebts,
  Debt,
  SimplifiedPayment,
  SimplificationResult,
} from '../simplify-debts';

// =============================================================================
// Test Data Helpers
// =============================================================================

const createDebt = (
  debtor: string,
  creditor: string,
  amount: number
): Debt => ({
  debtor,
  creditor,
  amount,
});

// =============================================================================
// Tests
// =============================================================================

describe('Simplify Debts Algorithm', () => {
  describe('simplifyDebts', () => {
    it('should return empty result for empty input', () => {
      const result = simplifyDebts([]);
      
      expect(result.simplifiedPayments).toEqual([]);
      expect(result.originalCount).toBe(0);
      expect(result.simplifiedCount).toBe(0);
      expect(result.savingsCount).toBe(0);
    });

    it('should return single debt unchanged', () => {
      const debts: Debt[] = [
        createDebt('alice', 'bob', 50),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0]).toEqual({
        from: 'alice',
        to: 'bob',
        amount: 50,
      });
      expect(result.originalCount).toBe(1);
      expect(result.simplifiedCount).toBe(1);
      expect(result.savingsCount).toBe(0);
    });

    it('should eliminate circular debts', () => {
      // Alice owes Bob $50, Bob owes Alice $50 → net zero
      const debts: Debt[] = [
        createDebt('alice', 'bob', 50),
        createDebt('bob', 'alice', 50),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(0);
      expect(result.originalCount).toBe(2);
      expect(result.simplifiedCount).toBe(0);
      expect(result.savingsCount).toBe(2);
    });

    it('should simplify partial circular debts', () => {
      // Alice owes Bob $100, Bob owes Alice $30 → Alice owes Bob $70
      const debts: Debt[] = [
        createDebt('alice', 'bob', 100),
        createDebt('bob', 'alice', 30),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0]).toEqual({
        from: 'alice',
        to: 'bob',
        amount: 70,
      });
      expect(result.originalCount).toBe(2);
      expect(result.simplifiedCount).toBe(1);
      expect(result.savingsCount).toBe(1);
    });

    it('should simplify chain debts: A → B → C becomes A → C', () => {
      // Alice owes Bob $50, Bob owes Charlie $50 → Alice pays Charlie directly
      const debts: Debt[] = [
        createDebt('alice', 'bob', 50),
        createDebt('bob', 'charlie', 50),
      ];

      const result = simplifyDebts(debts);
      
      // Bob nets to zero, so only Alice → Charlie remains
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0]).toEqual({
        from: 'alice',
        to: 'charlie',
        amount: 50,
      });
      expect(result.originalCount).toBe(2);
      expect(result.simplifiedCount).toBe(1);
    });

    it('should handle complex multi-party debts', () => {
      // A owes B $30, A owes C $20
      // B owes C $10
      // Net positions: A: -$50, B: +$20 (receives 30, pays 10), C: +$30 (receives 20+10)
      const debts: Debt[] = [
        createDebt('alice', 'bob', 30),
        createDebt('alice', 'charlie', 20),
        createDebt('bob', 'charlie', 10),
      ];

      const result = simplifyDebts(debts);
      
      // Net positions: Alice: -50, Bob: +20, Charlie: +30
      // Simplified: Alice pays Bob 20, Alice pays Charlie 30
      expect(result.simplifiedPayments).toHaveLength(2);
      expect(result.originalCount).toBe(3);
      expect(result.simplifiedCount).toBe(2);
      expect(result.savingsCount).toBe(1);

      // Check that total amounts are preserved
      const totalFromAlice = result.simplifiedPayments
        .filter(p => p.from === 'alice')
        .reduce((sum, p) => sum + p.amount, 0);
      expect(totalFromAlice).toBe(50);

      const toBob = result.simplifiedPayments.find(p => p.to === 'bob');
      const toCharlie = result.simplifiedPayments.find(p => p.to === 'charlie');
      expect(toBob?.amount).toBe(20);
      expect(toCharlie?.amount).toBe(30);
    });

    it('should handle 7 payments reduced to 3 (realistic scenario)', () => {
      // Real scenario: 4 friends split multiple dinners
      // Multiple cross-debts that can be simplified
      const debts: Debt[] = [
        createDebt('alice', 'bob', 25),      // Dinner 1
        createDebt('charlie', 'bob', 25),    // Dinner 1
        createDebt('dave', 'bob', 25),       // Dinner 1
        createDebt('alice', 'charlie', 30),  // Dinner 2
        createDebt('bob', 'charlie', 30),    // Dinner 2
        createDebt('dave', 'charlie', 30),   // Dinner 2
        createDebt('alice', 'dave', 20),     // Dinner 3
      ];

      const result = simplifyDebts(debts);
      
      // Net positions:
      // Alice: -(25+30+20) = -75
      // Bob: +(25+25+25) - 30 = +45
      // Charlie: +(30+30+30) - 25 = +65
      // Dave: -(25+30) + 20 = -35
      // Total: 0 (balanced)
      
      // Verify simplification reduces payment count
      expect(result.originalCount).toBe(7);
      expect(result.simplifiedCount).toBeLessThanOrEqual(3);
      
      // Verify total amounts preserved for each person
      const netPositions = new Map<string, number>();
      for (const payment of result.simplifiedPayments) {
        netPositions.set(payment.from, (netPositions.get(payment.from) || 0) - payment.amount);
        netPositions.set(payment.to, (netPositions.get(payment.to) || 0) + payment.amount);
      }
      
      // Alice's net should still be -75 (she pays 75 total)
      expect(netPositions.get('alice') || 0).toBe(-75);
      // Bob's net should be +45 (he receives 45 total)
      expect(netPositions.get('bob') || 0).toBe(45);
      // Charlie's net should be +65
      expect(netPositions.get('charlie') || 0).toBe(65);
      // Dave's net should be -35
      expect(netPositions.get('dave') || 0).toBe(-35);
    });

    it('should handle debts with decimal amounts', () => {
      const debts: Debt[] = [
        createDebt('alice', 'bob', 33.33),
        createDebt('bob', 'alice', 16.67),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0].from).toBe('alice');
      expect(result.simplifiedPayments[0].to).toBe('bob');
      // Should round to 2 decimal places
      expect(result.simplifiedPayments[0].amount).toBeCloseTo(16.66, 2);
    });

    it('should handle zero amount debts', () => {
      const debts: Debt[] = [
        createDebt('alice', 'bob', 0),
        createDebt('charlie', 'dave', 50),
      ];

      const result = simplifyDebts(debts);
      
      // Zero amounts should be filtered out
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0]).toEqual({
        from: 'charlie',
        to: 'dave',
        amount: 50,
      });
    });

    it('should handle negative amounts gracefully (treat as reverse direction)', () => {
      // A negative debt from A to B means B actually owes A
      const debts: Debt[] = [
        createDebt('alice', 'bob', -50), // Actually Bob owes Alice
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0]).toEqual({
        from: 'bob',
        to: 'alice',
        amount: 50,
      });
    });

    it('should consolidate multiple debts between same parties', () => {
      const debts: Debt[] = [
        createDebt('alice', 'bob', 25),
        createDebt('alice', 'bob', 30),
        createDebt('alice', 'bob', 45),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0]).toEqual({
        from: 'alice',
        to: 'bob',
        amount: 100,
      });
      expect(result.originalCount).toBe(3);
      expect(result.simplifiedCount).toBe(1);
      expect(result.savingsCount).toBe(2);
    });

    it('should be case-insensitive for party names', () => {
      const debts: Debt[] = [
        createDebt('Alice', 'bob', 50),
        createDebt('alice', 'Bob', 30),
        createDebt('BOB', 'ALICE', 20),
      ];

      const result = simplifyDebts(debts);
      
      // All refer to same people, should consolidate
      // Alice owes Bob 50+30=80, Bob owes Alice 20
      // Net: Alice owes Bob 60
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0].amount).toBe(60);
    });

    it('should handle self-debts (ignore them)', () => {
      const debts: Debt[] = [
        createDebt('alice', 'alice', 50), // Invalid: self-debt
        createDebt('alice', 'bob', 30),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      expect(result.simplifiedPayments[0]).toEqual({
        from: 'alice',
        to: 'bob',
        amount: 30,
      });
    });

    it('should preserve original party names (use first occurrence casing)', () => {
      const debts: Debt[] = [
        createDebt('Alice Smith', 'Bob Jones', 50),
        createDebt('alice smith', 'bob jones', 30),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.simplifiedPayments).toHaveLength(1);
      // Should use original casing from first occurrence
      expect(result.simplifiedPayments[0].from).toBe('Alice Smith');
      expect(result.simplifiedPayments[0].to).toBe('Bob Jones');
      expect(result.simplifiedPayments[0].amount).toBe(80);
    });

    it('should include metadata about savings', () => {
      const debts: Debt[] = [
        createDebt('alice', 'bob', 50),
        createDebt('bob', 'alice', 50),
        createDebt('charlie', 'dave', 25),
      ];

      const result = simplifyDebts(debts);
      
      expect(result.originalCount).toBe(3);
      expect(result.simplifiedCount).toBe(1); // Only charlie → dave remains
      expect(result.savingsCount).toBe(2);
      expect(result.savingsMessage).toContain('1');
      expect(result.savingsMessage).toContain('3');
    });
  });
});
