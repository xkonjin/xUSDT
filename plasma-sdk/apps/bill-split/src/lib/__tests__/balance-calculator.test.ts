/**
 * Balance Calculator Tests
 * 
 * Tests for calculating user balances across all bills.
 * TDD: Tests written first, before implementation.
 */

import {
  calculateBalances,
  calculateNetBalance,
  groupBalancesByPerson,
} from '../balance-calculator';

// =============================================================================
// Test Data
// =============================================================================

interface MockBill {
  id: string;
  creatorAddress: string;
  participants: Array<{
    id: string;
    name: string;
    email?: string;
    share: number;
    paid: boolean;
  }>;
  total: number;
}

const createMockBill = (overrides: Partial<MockBill> & Pick<MockBill, 'id'>): MockBill => ({
  creatorAddress: '0xCreator',
  participants: [],
  total: 0,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('Balance Calculator', () => {
  describe('calculateBalances', () => {
    it('should return zero balance when no bills exist', () => {
      const result = calculateBalances('0xCreator', []);
      
      expect(result.totalOwedToMe).toBe(0);
      expect(result.totalIOwe).toBe(0);
      expect(result.netBalance).toBe(0);
      expect(result.balances).toEqual([]);
    });

    it('should calculate amount owed to creator from unpaid participants', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 50, paid: false },
            { id: 'p2', name: 'Bob', email: 'bob@test.com', share: 50, paid: true },
          ],
        }),
      ];

      const result = calculateBalances('0xCreator', bills);
      
      // Alice owes $50, Bob already paid
      expect(result.totalOwedToMe).toBe(50);
      expect(result.totalIOwe).toBe(0);
      expect(result.netBalance).toBe(50);
    });

    it('should handle multiple unpaid participants across multiple bills', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 60,
          participants: [
            { id: 'p1', name: 'Alice', share: 30, paid: false },
            { id: 'p2', name: 'Bob', share: 30, paid: false },
          ],
        }),
        createMockBill({
          id: 'bill2',
          creatorAddress: '0xCreator',
          total: 40,
          participants: [
            { id: 'p3', name: 'Alice', email: 'alice@test.com', share: 20, paid: false },
            { id: 'p4', name: 'Charlie', share: 20, paid: true },
          ],
        }),
      ];

      const result = calculateBalances('0xCreator', bills);
      
      // Alice owes $30 + $20 = $50, Bob owes $30
      expect(result.totalOwedToMe).toBe(80);
      expect(result.netBalance).toBe(80);
    });

    it('should calculate amount user owes when they are a participant', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xOtherCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Me', email: 'me@test.com', share: 50, paid: false },
            { id: 'p2', name: 'Other', share: 50, paid: true },
          ],
        }),
      ];

      // User is participant in someone else's bill, linked by email
      const result = calculateBalances('0xMe', bills, 'me@test.com');
      
      expect(result.totalOwedToMe).toBe(0);
      expect(result.totalIOwe).toBe(50);
      expect(result.netBalance).toBe(-50);
    });

    it('should calculate net balance with both owed to me and I owe', () => {
      const bills: MockBill[] = [
        // Bill I created - someone owes me
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xMe',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', share: 100, paid: false },
          ],
        }),
        // Bill someone else created - I owe them
        createMockBill({
          id: 'bill2',
          creatorAddress: '0xAlice',
          total: 60,
          participants: [
            { id: 'p2', name: 'Me', email: 'me@test.com', share: 60, paid: false },
          ],
        }),
      ];

      const result = calculateBalances('0xMe', bills, 'me@test.com');
      
      expect(result.totalOwedToMe).toBe(100);
      expect(result.totalIOwe).toBe(60);
      expect(result.netBalance).toBe(40); // positive = net owed to me
    });

    it('should not count creator as owing themselves', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Creator', email: 'creator@test.com', share: 50, paid: false },
            { id: 'p2', name: 'Other', share: 50, paid: false },
          ],
        }),
      ];

      // Creator should only see what others owe, not themselves
      const result = calculateBalances('0xCreator', bills, 'creator@test.com');
      
      expect(result.totalOwedToMe).toBe(50); // Only Other owes
      expect(result.totalIOwe).toBe(0);
    });
  });

  describe('groupBalancesByPerson', () => {
    it('should group balances by person name/email', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 60,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 30, paid: false },
            { id: 'p2', name: 'Bob', share: 30, paid: false },
          ],
        }),
        createMockBill({
          id: 'bill2',
          creatorAddress: '0xCreator',
          total: 40,
          participants: [
            { id: 'p3', name: 'Alice', email: 'alice@test.com', share: 40, paid: false },
          ],
        }),
      ];

      const result = groupBalancesByPerson('0xCreator', bills);
      
      expect(result).toHaveLength(2);
      
      const alice = result.find(p => p.name === 'Alice');
      expect(alice?.amount).toBe(70); // $30 + $40
      expect(alice?.direction).toBe('owes_me');
      
      const bob = result.find(p => p.name === 'Bob');
      expect(bob?.amount).toBe(30);
      expect(bob?.direction).toBe('owes_me');
    });

    it('should handle when user owes others', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xAlice',
          total: 50,
          participants: [
            { id: 'p1', name: 'Me', email: 'me@test.com', share: 50, paid: false },
          ],
        }),
        createMockBill({
          id: 'bill2',
          creatorAddress: '0xBob',
          total: 30,
          participants: [
            { id: 'p2', name: 'Me', email: 'me@test.com', share: 30, paid: false },
          ],
        }),
      ];

      const result = groupBalancesByPerson('0xMe', bills, 'me@test.com');
      
      // Should show Alice and Bob as people I owe
      const alice = result.find(p => p.address === '0xAlice');
      expect(alice?.amount).toBe(50);
      expect(alice?.direction).toBe('i_owe');
      
      const bob = result.find(p => p.address === '0xBob');
      expect(bob?.amount).toBe(30);
      expect(bob?.direction).toBe('i_owe');
    });

    it('should track separate balances when identities cannot be linked', () => {
      // In real usage, Alice as participant (email) and Alice as creator (address)
      // cannot be automatically linked unless we have shared identifier info
      const bills: MockBill[] = [
        // I created bill, Alice owes me $50
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xMe',
          total: 50,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 50, paid: false },
          ],
        }),
        // Alice created bill, I owe her $30 (different identity - address only)
        createMockBill({
          id: 'bill2',
          creatorAddress: '0xAlice',
          total: 30,
          participants: [
            { id: 'p2', name: 'Me', email: 'me@test.com', share: 30, paid: false },
          ],
        }),
      ];

      const result = groupBalancesByPerson('0xMe', bills, 'me@test.com');
      
      // Without identity linking, these appear as separate people
      // Alice (by email) owes me $50
      const aliceByEmail = result.find(p => p.email === 'alice@test.com');
      expect(aliceByEmail?.amount).toBe(50);
      expect(aliceByEmail?.direction).toBe('owes_me');
      
      // 0xAlice (by address) - I owe them $30
      const aliceByAddress = result.find(p => p.address === '0xAlice');
      expect(aliceByAddress?.amount).toBe(30);
      expect(aliceByAddress?.direction).toBe('i_owe');
    });

    it('should merge balances when same email appears in multiple contexts', () => {
      // Same person (same email) owes money in one bill, is owed in another
      const bills: MockBill[] = [
        // I created bill, Alice owes me $50
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xMe',
          total: 50,
          participants: [
            { id: 'p1', name: 'Alice', email: 'alice@test.com', share: 50, paid: false },
          ],
        }),
        // Same bill but Alice also appears in another bill I created, with same email
        createMockBill({
          id: 'bill2',
          creatorAddress: '0xMe',
          total: 30,
          participants: [
            { id: 'p2', name: 'Alice', email: 'alice@test.com', share: 30, paid: false },
          ],
        }),
      ];

      const result = groupBalancesByPerson('0xMe', bills);
      
      // Same email = same person, balances merge
      expect(result).toHaveLength(1);
      const alice = result[0];
      expect(alice.email).toBe('alice@test.com');
      expect(alice.amount).toBe(80); // $50 + $30
      expect(alice.direction).toBe('owes_me');
    });

    it('should return empty array when all balances are settled', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', share: 50, paid: true },
            { id: 'p2', name: 'Bob', share: 50, paid: true },
          ],
        }),
      ];

      const result = groupBalancesByPerson('0xCreator', bills);
      
      expect(result).toHaveLength(0);
    });

    it('should sort by amount descending', () => {
      const bills: MockBill[] = [
        createMockBill({
          id: 'bill1',
          creatorAddress: '0xCreator',
          total: 100,
          participants: [
            { id: 'p1', name: 'Alice', share: 30, paid: false },
            { id: 'p2', name: 'Bob', share: 50, paid: false },
            { id: 'p3', name: 'Charlie', share: 20, paid: false },
          ],
        }),
      ];

      const result = groupBalancesByPerson('0xCreator', bills);
      
      expect(result[0].name).toBe('Bob');
      expect(result[1].name).toBe('Alice');
      expect(result[2].name).toBe('Charlie');
    });
  });

  describe('calculateNetBalance', () => {
    it('should return positive for net owed to user', () => {
      expect(calculateNetBalance(100, 30)).toBe(70);
    });

    it('should return negative for net user owes', () => {
      expect(calculateNetBalance(30, 100)).toBe(-70);
    });

    it('should return zero when balanced', () => {
      expect(calculateNetBalance(50, 50)).toBe(0);
    });
  });
});
