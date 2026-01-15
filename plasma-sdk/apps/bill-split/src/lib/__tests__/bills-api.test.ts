/**
 * Bills API Tests
 * 
 * Unit tests for bill validation and creation logic.
 * API route integration tests are handled separately in E2E tests.
 */

import { validateBillCreate, validateBillUpdate, ValidationError, sanitizeString } from '../validation';
import { calculateAllShares, BillItem, Participant } from '../share-calculation';

describe('Bills API Logic', () => {
  describe('Bill Validation', () => {
    const validBillData = {
      creatorAddress: '0x1234567890123456789012345678901234567890',
      title: 'Dinner at Restaurant',
      items: [
        { id: 'item1', name: 'Pizza', price: 15.99, quantity: 1, assignedToParticipantIds: ['p1'] },
        { id: 'item2', name: 'Pasta', price: 12.99, quantity: 1, assignedToParticipantIds: ['p2'] },
      ],
      participants: [
        { id: 'p1', name: 'Alice', email: 'alice@example.com' },
        { id: 'p2', name: 'Bob', phone: '+1234567890' },
      ],
      subtotal: 28.98,
      tax: 2.61,
      taxPercent: 9,
      tip: 4.35,
      tipPercent: 15,
      total: 35.94,
    };

    it('should validate valid bill data', () => {
      const result = validateBillCreate(validBillData);
      
      expect(result.title).toBe('Dinner at Restaurant');
      expect(result.items).toHaveLength(2);
      expect(result.participants).toHaveLength(2);
    });

    it('should reject bill without title', () => {
      const invalidData = { ...validBillData, title: '' };
      
      expect(() => validateBillCreate(invalidData)).toThrow(ValidationError);
    });

    it('should reject bill without items', () => {
      const invalidData = { ...validBillData, items: [] };
      
      expect(() => validateBillCreate(invalidData)).toThrow(ValidationError);
    });

    it('should reject bill without participants', () => {
      const invalidData = { ...validBillData, participants: [] };
      
      expect(() => validateBillCreate(invalidData)).toThrow(ValidationError);
    });

    it('should reject invalid creator address', () => {
      const invalidData = { ...validBillData, creatorAddress: 'invalid-address' };
      
      expect(() => validateBillCreate(invalidData)).toThrow(ValidationError);
    });

    it('should reject negative prices', () => {
      const invalidData = {
        ...validBillData,
        items: [{ id: 'item1', name: 'Item', price: -10, quantity: 1 }],
      };
      
      expect(() => validateBillCreate(invalidData)).toThrow(ValidationError);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        ...validBillData,
        participants: [{ id: 'p1', name: 'Alice', email: 'not-an-email' }],
      };
      
      expect(() => validateBillCreate(invalidData)).toThrow(ValidationError);
    });

    it('should accept valid update data', () => {
      const updateData = {
        title: 'Updated Title',
        items: [{ id: 'item1', name: 'New Item', price: 20, quantity: 2 }],
        participants: [{ id: 'p1', name: 'Alice' }],
      };
      
      const result = validateBillUpdate(updateData);
      expect(result.title).toBe('Updated Title');
    });
  });

  describe('XSS Sanitization', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should remove HTML tags', () => {
      const input = '<div>Hello</div><span>World</span>';
      const result = sanitizeString(input);
      
      expect(result).not.toContain('<div>');
      expect(result).toContain('HelloWorld');
    });

    it('should handle null input', () => {
      expect(sanitizeString(null)).toBe('');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(1000);
      const result = sanitizeString(longString, 100);
      
      expect(result).toHaveLength(100);
    });

    it('should sanitize bill title during validation', () => {
      const dataWithXss = {
        ...validBillData,
        title: '<script>alert("xss")</script>Dinner',
      };
      
      const result = validateBillCreate(dataWithXss);
      expect(result.title).not.toContain('<script>');
      expect(result.title).toContain('Dinner');
    });
  });

  describe('Share Calculation Integration', () => {
    it('should calculate shares correctly for bill data', () => {
      const items: BillItem[] = [
        { id: 'item1', price: 15.99, quantity: 1, assignedToParticipantIds: ['p1'] },
        { id: 'item2', price: 12.99, quantity: 1, assignedToParticipantIds: ['p2'] },
      ];
      
      const participants: Participant[] = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ];

      const subtotal = 28.98;
      const tax = 2.61;
      const tip = 4.35;

      const shares = calculateAllShares(items, participants, subtotal, tax, tip);
      
      // Alice: 15.99 + proportional tax/tip
      // Bob: 12.99 + proportional tax/tip
      expect(shares['p1']).toBeGreaterThan(15.99);
      expect(shares['p2']).toBeGreaterThan(12.99);
      
      // Total shares should approximate total
      const totalShares = shares['p1'] + shares['p2'];
      expect(totalShares).toBeCloseTo(subtotal + tax + tip, 0);
    });
  });

  const validBillData = {
    creatorAddress: '0x1234567890123456789012345678901234567890',
    title: 'Dinner at Restaurant',
    items: [
      { id: 'item1', name: 'Pizza', price: 15.99, quantity: 1, assignedToParticipantIds: ['p1'] },
      { id: 'item2', name: 'Pasta', price: 12.99, quantity: 1, assignedToParticipantIds: ['p2'] },
    ],
    participants: [
      { id: 'p1', name: 'Alice', email: 'alice@example.com' },
      { id: 'p2', name: 'Bob', phone: '+1234567890' },
    ],
    subtotal: 28.98,
    tax: 2.61,
    taxPercent: 9,
    tip: 4.35,
    tipPercent: 15,
    total: 35.94,
  };
});
