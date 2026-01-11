/**
 * Balance API Tests
 * 
 * Unit tests for balance calculation API endpoint logic.
 * TDD: Tests written first, before implementation.
 */

import {
  calculateBalances,
  groupBalancesByPerson,
  BalanceSummary,
  Bill,
} from '../balance-calculator';

// Note: We test the underlying logic here.
// Full API endpoint tests would be in E2E tests.

describe('Balance API Logic', () => {
  describe('API Response Format', () => {
    it('should return properly formatted balance summary', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 50, paid: false },
            { id: 'p2', name: 'Bob', email: 'bob@test.com', share: 50, paid: true },
          ],
        },
      ];

      const result = calculateBalances('0xCreator', bills);

      // Verify structure
      expect(result).toHaveProperty('totalOwedToMe');
      expect(result).toHaveProperty('totalIOwe');
      expect(result).toHaveProperty('netBalance');
      expect(result).toHaveProperty('balances');
      expect(Array.isArray(result.balances)).toBe(true);

      // Verify types
      expect(typeof result.totalOwedToMe).toBe('number');
      expect(typeof result.totalIOwe).toBe('number');
      expect(typeof result.netBalance).toBe('number');
    });

    it('should include bill IDs in person balances', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 50,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 50, paid: false },
          ],
        },
        {
          id: 'bill2',
          creatorAddress: '0xCreator',
          total: 30,
          participants: [
            { id: 'p2', name: 'Alice', email: 'alice@test.com', share: 30, paid: false },
          ],
        },
      ];

      const result = groupBalancesByPerson('0xCreator', bills);

      // Same email = same person, bills should be merged
      expect(result).toHaveLength(1);
      expect(result[0].bills).toContain('bill1');
      expect(result[0].bills).toContain('bill2');
    });
  });

  describe('Edge Cases for API', () => {
    it('should handle very large amounts', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 999999.99,
          participants: [
            { id: 'p1', name: 'BigSpender', share: 999999.99, paid: false },
          ],
        },
      ];

      const result = calculateBalances('0xCreator', bills);

      expect(result.totalOwedToMe).toBe(999999.99);
    });

    it('should handle decimal precision', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 33.33,
          participants: [
            { id: 'p1', name: 'Alice', share: 11.11, paid: false },
            { id: 'p2', name: 'Bob', share: 11.11, paid: false },
            { id: 'p3', name: 'Charlie', share: 11.11, paid: false },
          ],
        },
      ];

      const result = calculateBalances('0xCreator', bills);

      // Should handle currency precision (2 decimal places)
      expect(result.totalOwedToMe).toBe(33.33);
    });

    it('should handle mixed case addresses', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', share: 100, paid: false },
          ],
        },
      ];

      // Query with different case
      const result = calculateBalances('0xCREATOR', bills);

      expect(result.totalOwedToMe).toBe(100);
    });

    it('should handle null emails gracefully', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 50,
          participants: [
            { id: 'p1', name: 'NoEmail', email: null, share: 50, paid: false },
          ],
        },
      ];

      const result = calculateBalances('0xCreator', bills);

      expect(result.totalOwedToMe).toBe(50);
      expect(result.balances[0].name).toBe('NoEmail');
    });

    it('should return zero for address with no bills', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xOtherCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', share: 100, paid: false },
          ],
        },
      ];

      // Different user queries
      const result = calculateBalances('0xUnrelated', bills, 'unrelated@test.com');

      expect(result.totalOwedToMe).toBe(0);
      expect(result.totalIOwe).toBe(0);
      expect(result.netBalance).toBe(0);
      expect(result.balances).toHaveLength(0);
    });
  });

  describe('Balance Direction', () => {
    it('should correctly identify owes_me direction', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xMe',
          total: 100,
          participants: [
            { id: 'p1', name: 'Debtor', share: 100, paid: false },
          ],
        },
      ];

      const result = groupBalancesByPerson('0xMe', bills);

      expect(result[0].direction).toBe('owes_me');
      expect(result[0].amount).toBe(100);
    });

    it('should correctly identify i_owe direction', () => {
      const bills: Bill[] = [
        {
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Me', email: 'me@test.com', share: 100, paid: false },
          ],
        },
      ];

      const result = groupBalancesByPerson('0xMe', bills, 'me@test.com');

      expect(result[0].direction).toBe('i_owe');
      expect(result[0].amount).toBe(100);
    });
  });
});
