/**
 * Input Validation Tests
 * 
 * TDD tests for zod schemas and sanitization
 */

import {
  billCreateSchema,
  sanitizeString,
  sanitizeBillInput,
  validateBillCreate,
  ValidationError,
} from '../validation';

describe('sanitizeString', () => {
  it('removes HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>Hello')).toBe('Hello');
  });

  it('removes script tags and content', () => {
    const malicious = '<script>document.cookie</script>Clean text';
    expect(sanitizeString(malicious)).not.toContain('script');
    expect(sanitizeString(malicious)).toContain('Clean text');
  });

  it('escapes HTML entities', () => {
    expect(sanitizeString('A < B > C')).toBe('A &lt; B &gt; C');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('handles empty strings', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('handles null/undefined', () => {
    expect(sanitizeString(null as any)).toBe('');
    expect(sanitizeString(undefined as any)).toBe('');
  });

  it('limits string length', () => {
    const longString = 'a'.repeat(1000);
    expect(sanitizeString(longString, 100).length).toBe(100);
  });

  it('removes dangerous attributes', () => {
    const malicious = '<img onerror="alert(1)" src="x">text';
    expect(sanitizeString(malicious)).not.toContain('onerror');
  });
});

describe('billCreateSchema', () => {
  const validBill = {
    creatorAddress: '0x1234567890123456789012345678901234567890',
    title: 'Dinner at Restaurant',
    items: [
      { name: 'Burger', price: 12.99, quantity: 1 },
      { name: 'Fries', price: 4.99, quantity: 1 },
    ],
    participants: [
      { name: 'Alice', id: 'p1' },
      { name: 'Bob', id: 'p2' },
    ],
    subtotal: 17.98,
    tax: 1.62,
    total: 19.60,
  };

  it('validates a correct bill', () => {
    const result = billCreateSchema.safeParse(validBill);
    expect(result.success).toBe(true);
  });

  it('requires creatorAddress', () => {
    const { creatorAddress, ...billWithoutCreator } = validBill;
    const result = billCreateSchema.safeParse(billWithoutCreator);
    expect(result.success).toBe(false);
  });

  it('requires valid Ethereum address', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      creatorAddress: 'invalid-address',
    });
    expect(result.success).toBe(false);
  });

  it('requires title', () => {
    const { title, ...billWithoutTitle } = validBill;
    const result = billCreateSchema.safeParse(billWithoutTitle);
    expect(result.success).toBe(false);
  });

  it('limits title length to 200 characters', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one item', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('requires at least one participant', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      participants: [],
    });
    expect(result.success).toBe(false);
  });

  it('validates item price is positive', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      items: [{ name: 'Item', price: -5, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('validates item quantity is positive integer', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      items: [{ name: 'Item', price: 10, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('limits item name length', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      items: [{ name: 'a'.repeat(201), price: 10, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('requires participant name', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      participants: [{ id: 'p1' }],
    });
    expect(result.success).toBe(false);
  });

  it('validates optional email format', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      participants: [{ name: 'Alice', id: 'p1', email: 'invalid-email' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid email', () => {
    const result = billCreateSchema.safeParse({
      ...validBill,
      participants: [{ name: 'Alice', id: 'p1', email: 'alice@example.com' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('sanitizeBillInput', () => {
  it('sanitizes title', () => {
    const input = {
      creatorAddress: '0x1234567890123456789012345678901234567890',
      title: '<script>alert("xss")</script>Dinner',
      items: [{ name: 'Item', price: 10, quantity: 1 }],
      participants: [{ name: 'Alice', id: 'p1' }],
    };
    
    const sanitized = sanitizeBillInput(input);
    expect(sanitized.title).not.toContain('<script>');
    expect(sanitized.title).toContain('Dinner');
  });

  it('sanitizes item names', () => {
    const input = {
      creatorAddress: '0x1234567890123456789012345678901234567890',
      title: 'Dinner',
      items: [{ name: '<b onclick="hack()">Burger</b>', price: 10, quantity: 1 }],
      participants: [{ name: 'Alice', id: 'p1' }],
    };
    
    const sanitized = sanitizeBillInput(input);
    expect(sanitized.items[0].name).not.toContain('onclick');
    expect(sanitized.items[0].name).toContain('Burger');
  });

  it('sanitizes participant names', () => {
    const input = {
      creatorAddress: '0x1234567890123456789012345678901234567890',
      title: 'Dinner',
      items: [{ name: 'Item', price: 10, quantity: 1 }],
      participants: [{ name: '<img onerror="alert(1)">Alice', id: 'p1' }],
    };
    
    const sanitized = sanitizeBillInput(input);
    expect(sanitized.participants[0].name).not.toContain('onerror');
    expect(sanitized.participants[0].name).toContain('Alice');
  });

  it('preserves numeric values', () => {
    const input = {
      creatorAddress: '0x1234567890123456789012345678901234567890',
      title: 'Dinner',
      items: [{ name: 'Item', price: 12.99, quantity: 2 }],
      participants: [{ name: 'Alice', id: 'p1' }],
      subtotal: 25.98,
      tax: 2.34,
      total: 28.32,
    };
    
    const sanitized = sanitizeBillInput(input);
    expect(sanitized.items[0].price).toBe(12.99);
    expect(sanitized.items[0].quantity).toBe(2);
    expect(sanitized.subtotal).toBe(25.98);
  });
});

describe('validateBillCreate', () => {
  it('returns validated and sanitized data for valid input', () => {
    const input = {
      creatorAddress: '0x1234567890123456789012345678901234567890',
      title: '  Dinner at <b>Restaurant</b>  ',
      items: [{ name: 'Burger', price: 12.99, quantity: 1 }],
      participants: [{ name: 'Alice', id: 'p1' }],
    };
    
    const result = validateBillCreate(input);
    expect(result.title).toBe('Dinner at Restaurant');
    expect(result.creatorAddress).toBe('0x1234567890123456789012345678901234567890');
  });

  it('throws ValidationError for invalid input', () => {
    const input = {
      title: 'Dinner',
      // Missing creatorAddress
      items: [],
      participants: [],
    };
    
    expect(() => validateBillCreate(input)).toThrow(ValidationError);
  });

  it('includes field errors in ValidationError', () => {
    const input = {
      creatorAddress: 'invalid',
      title: '',
      items: [],
      participants: [],
    };
    
    try {
      validateBillCreate(input);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.errors.length).toBeGreaterThan(0);
    }
  });
});
