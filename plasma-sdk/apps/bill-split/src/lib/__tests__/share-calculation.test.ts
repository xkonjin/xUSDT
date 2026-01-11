/**
 * Share Calculation Tests
 * 
 * Tests for participant share calculation logic.
 */

import {
  calculateItemShare,
  calculateParticipantShare,
  calculateAllShares,
  roundCurrency,
  BillItem,
  Participant,
} from '../share-calculation';

describe('Share Calculation', () => {
  describe('roundCurrency', () => {
    it('should round to 2 decimal places', () => {
      expect(roundCurrency(10.125)).toBe(10.13);
      expect(roundCurrency(10.124)).toBe(10.12);
      expect(roundCurrency(10.1)).toBe(10.1);
    });

    it('should handle zero', () => {
      expect(roundCurrency(0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(roundCurrency(-10.125)).toBe(-10.12);
    });
  });

  describe('calculateItemShare', () => {
    it('should return full price when one participant assigned', () => {
      const item: BillItem = {
        id: 'item1',
        price: 20,
        quantity: 1,
        assignedToParticipantIds: ['p1'],
      };
      
      expect(calculateItemShare(item, 'p1')).toBe(20);
    });

    it('should split evenly between two participants', () => {
      const item: BillItem = {
        id: 'item1',
        price: 20,
        quantity: 1,
        assignedToParticipantIds: ['p1', 'p2'],
      };
      
      expect(calculateItemShare(item, 'p1')).toBe(10);
      expect(calculateItemShare(item, 'p2')).toBe(10);
    });

    it('should handle odd splits correctly', () => {
      const item: BillItem = {
        id: 'item1',
        price: 10,
        quantity: 1,
        assignedToParticipantIds: ['p1', 'p2', 'p3'],
      };
      
      // 10 / 3 = 3.333...
      expect(calculateItemShare(item, 'p1')).toBeCloseTo(3.33, 2);
    });

    it('should return 0 for unassigned participant', () => {
      const item: BillItem = {
        id: 'item1',
        price: 20,
        quantity: 1,
        assignedToParticipantIds: ['p1'],
      };
      
      expect(calculateItemShare(item, 'p2')).toBe(0);
    });

    it('should multiply by quantity', () => {
      const item: BillItem = {
        id: 'item1',
        price: 10,
        quantity: 3,
        assignedToParticipantIds: ['p1'],
      };
      
      expect(calculateItemShare(item, 'p1')).toBe(30);
    });

    it('should return 0 for item with no assignments', () => {
      const item: BillItem = {
        id: 'item1',
        price: 20,
        quantity: 1,
        assignedToParticipantIds: [],
      };
      
      expect(calculateItemShare(item, 'p1')).toBe(0);
    });
  });

  describe('calculateParticipantShare', () => {
    const items: BillItem[] = [
      { id: 'item1', price: 20, quantity: 1, assignedToParticipantIds: ['p1'] },
      { id: 'item2', price: 10, quantity: 2, assignedToParticipantIds: ['p1', 'p2'] },
    ];

    it('should calculate total items share for participant', () => {
      // p1: 20 + (10*2)/2 = 20 + 10 = 30
      const share = calculateParticipantShare('p1', items, 0, 0, 40);
      expect(share).toBe(30);
    });

    it('should add proportional tax', () => {
      // p1: items = 30, subtotal = 40, tax = 4
      // p1's tax = 4 * (30/40) = 3
      const share = calculateParticipantShare('p1', items, 4, 0, 40);
      expect(share).toBe(33);
    });

    it('should add proportional tip', () => {
      // p1: items = 30, subtotal = 40, tip = 8
      // p1's tip = 8 * (30/40) = 6
      const share = calculateParticipantShare('p1', items, 0, 8, 40);
      expect(share).toBe(36);
    });

    it('should add both tax and tip proportionally', () => {
      // p1: items = 30, subtotal = 40
      // tax = 4, p1's tax = 3
      // tip = 8, p1's tip = 6
      // total = 30 + 3 + 6 = 39
      const share = calculateParticipantShare('p1', items, 4, 8, 40);
      expect(share).toBe(39);
    });

    it('should handle zero subtotal', () => {
      const emptyItems: BillItem[] = [];
      const share = calculateParticipantShare('p1', emptyItems, 0, 0, 0);
      expect(share).toBe(0);
    });
  });

  describe('calculateAllShares', () => {
    it('should calculate shares for all participants', () => {
      const items: BillItem[] = [
        { id: 'item1', price: 20, quantity: 1, assignedToParticipantIds: ['p1'] },
        { id: 'item2', price: 20, quantity: 1, assignedToParticipantIds: ['p2'] },
      ];
      
      const participants: Participant[] = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];

      const shares = calculateAllShares(items, participants, 40, 4, 6);
      
      // Each person: items = 20, tax share = 2, tip share = 3
      // Total each = 25
      expect(shares['p1']).toBe(25);
      expect(shares['p2']).toBe(25);
    });

    it('should handle uneven splits', () => {
      const items: BillItem[] = [
        { id: 'item1', price: 30, quantity: 1, assignedToParticipantIds: ['p1'] },
        { id: 'item2', price: 10, quantity: 1, assignedToParticipantIds: ['p2'] },
      ];
      
      const participants: Participant[] = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];

      const shares = calculateAllShares(items, participants, 40, 4, 8);
      
      // p1: items=30, tax=30/40*4=3, tip=30/40*8=6, total=39
      // p2: items=10, tax=10/40*4=1, tip=10/40*8=2, total=13
      expect(shares['p1']).toBe(39);
      expect(shares['p2']).toBe(13);
    });

    it('should handle shared items', () => {
      const items: BillItem[] = [
        { id: 'item1', price: 20, quantity: 1, assignedToParticipantIds: ['p1', 'p2'] },
      ];
      
      const participants: Participant[] = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];

      const shares = calculateAllShares(items, participants, 20, 0, 0);
      
      expect(shares['p1']).toBe(10);
      expect(shares['p2']).toBe(10);
    });

    it('should return zero for participant with no items', () => {
      const items: BillItem[] = [
        { id: 'item1', price: 20, quantity: 1, assignedToParticipantIds: ['p1'] },
      ];
      
      const participants: Participant[] = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];

      const shares = calculateAllShares(items, participants, 20, 2, 4);
      
      expect(shares['p1']).toBe(26); // 20 + 2 + 4
      expect(shares['p2']).toBe(0);
    });

    it('should handle complex real-world scenario', () => {
      // Restaurant bill: 3 people, some shared items
      const items: BillItem[] = [
        { id: 'appetizer', price: 12, quantity: 1, assignedToParticipantIds: ['p1', 'p2', 'p3'] },
        { id: 'steak', price: 35, quantity: 1, assignedToParticipantIds: ['p1'] },
        { id: 'salmon', price: 28, quantity: 1, assignedToParticipantIds: ['p2'] },
        { id: 'chicken', price: 22, quantity: 1, assignedToParticipantIds: ['p3'] },
        { id: 'drinks', price: 24, quantity: 1, assignedToParticipantIds: ['p1', 'p2'] },
      ];
      
      const participants: Participant[] = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ];

      const subtotal = 121; // 12 + 35 + 28 + 22 + 24
      const tax = 10.89; // ~9%
      const tip = 18.15; // 15%

      const shares = calculateAllShares(items, participants, subtotal, tax, tip);
      
      // p1: appetizer/3=4 + steak=35 + drinks/2=12 = 51
      // p2: appetizer/3=4 + salmon=28 + drinks/2=12 = 44
      // p3: appetizer/3=4 + chicken=22 = 26
      
      // Tax and tip distributed proportionally
      // Total with tax+tip = 121 + 10.89 + 18.15 = 150.04
      
      // Sum of all shares should equal total (within rounding)
      const totalShares = shares['p1'] + shares['p2'] + shares['p3'];
      expect(totalShares).toBeCloseTo(150.04, 0);
    });
  });
});
