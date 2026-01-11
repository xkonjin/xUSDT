/**
 * Input Validation Tests
 * VENMO-009: Add Input Validation
 * 
 * Requirements:
 * - Validation schemas for API routes
 * - submit-transfer: address, amount, signature validation
 * - claims: amount, recipient email/phone validation
 * - payment-links: amount, title validation
 * - requests: amount, recipient validation
 * - Return proper error responses with field errors
 */

import { 
  submitTransferSchema,
  claimSchema,
  paymentLinkSchema,
  paymentRequestSchema,
  validateRequest,
  ValidationError
} from '../schemas';

describe('Input Validation Schemas', () => {
  describe('submitTransferSchema', () => {
    it('validates a correct submit-transfer request', () => {
      const validData = {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: '1000000',
        validAfter: 0,
        validBefore: 9999999999,
        nonce: '0x' + 'a'.repeat(64),
        v: 27,
        r: '0x' + 'b'.repeat(64),
        s: '0x' + 'c'.repeat(64),
      };

      const result = submitTransferSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid from address', () => {
      const invalidData = {
        from: 'not-an-address',
        to: '0x0987654321098765432109876543210987654321',
        value: '1000000',
        validAfter: 0,
        validBefore: 9999999999,
        nonce: '0x' + 'a'.repeat(64),
        v: 27,
        r: '0x' + 'b'.repeat(64),
        s: '0x' + 'c'.repeat(64),
      };

      const result = submitTransferSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('from');
      }
    });

    it('rejects invalid to address', () => {
      const invalidData = {
        from: '0x1234567890123456789012345678901234567890',
        to: '0xinvalid',
        value: '1000000',
        validAfter: 0,
        validBefore: 9999999999,
        nonce: '0x' + 'a'.repeat(64),
        v: 27,
        r: '0x' + 'b'.repeat(64),
        s: '0x' + 'c'.repeat(64),
      };

      const result = submitTransferSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const invalidData = {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        // missing value, nonce, v, r, s
      };

      const result = submitTransferSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects invalid signature components', () => {
      const invalidData = {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        value: '1000000',
        validAfter: 0,
        validBefore: 9999999999,
        nonce: '0x' + 'a'.repeat(64),
        v: 30, // Invalid v value (should be 27 or 28)
        r: '0x' + 'b'.repeat(64),
        s: '0x' + 'c'.repeat(64),
      };

      const result = submitTransferSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('claimSchema', () => {
    it('validates a correct claim request with email', () => {
      const validData = {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientEmail: 'test@example.com',
        authorization: { some: 'auth-data' },
        amount: '100.50',
      };

      const result = claimSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates a correct claim request with phone', () => {
      const validData = {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientPhone: '+1234567890',
        authorization: { some: 'auth-data' },
        amount: '100.50',
      };

      const result = claimSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid sender address', () => {
      const invalidData = {
        senderAddress: 'invalid-address',
        recipientEmail: 'test@example.com',
        authorization: { some: 'auth-data' },
        amount: '100.50',
      };

      const result = claimSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('senderAddress');
      }
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientEmail: 'not-an-email',
        authorization: { some: 'auth-data' },
        amount: '100.50',
      };

      const result = claimSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects invalid phone format', () => {
      const invalidData = {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientPhone: 'not-a-phone',
        authorization: { some: 'auth-data' },
        amount: '100.50',
      };

      const result = claimSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects zero or negative amount', () => {
      const invalidData = {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientEmail: 'test@example.com',
        authorization: { some: 'auth-data' },
        amount: '0',
      };

      const result = claimSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects missing authorization', () => {
      const invalidData = {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientEmail: 'test@example.com',
        amount: '100.50',
      };

      const result = claimSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('allows optional memo', () => {
      const validData = {
        senderAddress: '0x1234567890123456789012345678901234567890',
        recipientEmail: 'test@example.com',
        authorization: { some: 'auth-data' },
        amount: '100.50',
        memo: 'Payment for lunch',
      };

      const result = claimSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('paymentLinkSchema', () => {
    it('validates a correct payment link request', () => {
      const validData = {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        amount: '50.00',
        memo: 'Pay for services',
      };

      const result = paymentLinkSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('allows payment link without amount (any amount)', () => {
      const validData = {
        creatorAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = paymentLinkSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid creator address', () => {
      const invalidData = {
        creatorAddress: 'invalid',
        amount: '50.00',
      };

      const result = paymentLinkSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects negative amount', () => {
      const invalidData = {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        amount: '-50.00',
      };

      const result = paymentLinkSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('allows optional expiresInDays', () => {
      const validData = {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        amount: '50.00',
        expiresInDays: 30,
      };

      const result = paymentLinkSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('paymentRequestSchema', () => {
    it('validates a correct payment request', () => {
      const validData = {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: 'user@example.com',
        amount: '25.00',
      };

      const result = paymentRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates request with wallet address as recipient', () => {
      const validData = {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: '0x0987654321098765432109876543210987654321',
        amount: '25.00',
      };

      const result = paymentRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('validates request with phone as recipient', () => {
      const validData = {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: '+1234567890',
        amount: '25.00',
      };

      const result = paymentRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects invalid from address', () => {
      const invalidData = {
        fromAddress: 'not-valid',
        toIdentifier: 'user@example.com',
        amount: '25.00',
      };

      const result = paymentRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects empty toIdentifier', () => {
      const invalidData = {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: '',
        amount: '25.00',
      };

      const result = paymentRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('rejects zero or negative amount', () => {
      const invalidData = {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: 'user@example.com',
        amount: '-10.00',
      };

      const result = paymentRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('allows optional memo', () => {
      const validData = {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: 'user@example.com',
        amount: '25.00',
        memo: 'Rent payment',
      };

      const result = paymentRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('allows optional expiresInDays', () => {
      const validData = {
        fromAddress: '0x1234567890123456789012345678901234567890',
        toIdentifier: 'user@example.com',
        amount: '25.00',
        expiresInDays: 14,
      };

      const result = paymentRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('validateRequest', () => {
    it('returns validated data for valid input', () => {
      const validData = {
        creatorAddress: '0x1234567890123456789012345678901234567890',
        amount: '50.00',
      };

      const result = validateRequest(paymentLinkSchema, validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('returns formatted errors for invalid input', () => {
      const invalidData = {
        creatorAddress: 'invalid',
        amount: '-50.00',
      };

      const result = validateRequest(paymentLinkSchema, invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.fieldErrors).toBeDefined();
        expect(Object.keys(result.error.fieldErrors).length).toBeGreaterThan(0);
      }
    });

    it('returns error message for each invalid field', () => {
      const invalidData = {
        senderAddress: 'invalid',
        recipientEmail: 'not-email',
        authorization: null,
        amount: '0',
      };

      const result = validateRequest(claimSchema, invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.fieldErrors.senderAddress).toBeDefined();
        expect(result.error.fieldErrors.recipientEmail).toBeDefined();
        expect(result.error.fieldErrors.amount).toBeDefined();
      }
    });
  });

  describe('ValidationError', () => {
    it('creates a proper error response structure', () => {
      const error = new ValidationError({
        senderAddress: ['Invalid wallet address'],
        amount: ['Amount must be greater than 0'],
      });

      expect(error.message).toBe('Validation failed');
      expect(error.fieldErrors.senderAddress).toEqual(['Invalid wallet address']);
      expect(error.fieldErrors.amount).toEqual(['Amount must be greater than 0']);
    });

    it('converts to JSON response format', () => {
      const error = new ValidationError({
        email: ['Invalid email format'],
      });

      const json = error.toJSON();
      expect(json.error).toBe('Validation failed');
      expect(json.fieldErrors).toEqual({
        email: ['Invalid email format'],
      });
    });
  });
});
