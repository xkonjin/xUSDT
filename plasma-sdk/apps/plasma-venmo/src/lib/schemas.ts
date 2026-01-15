/**
 * Input Validation Schemas
 * VENMO-009: Add Input Validation
 * 
 * Provides:
 * - Zod validation schemas for API routes
 * - Type-safe validation with proper error messages
 * - Reusable field validators
 */

import { z } from 'zod';

// ============================================
// Common validators
// ============================================

/**
 * Ethereum address validator
 * Validates 0x-prefixed hex address with 40 characters
 */
const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

/**
 * Email validator
 */
const email = z.string().email('Invalid email format');

/**
 * Phone number validator (international format)
 */
const phone = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

/**
 * Amount validator - must be positive number
 */
const positiveAmount = z
  .string()
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than 0');

/**
 * Hex bytes32 validator (for nonce, r, s)
 */
const bytes32 = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid bytes32 format');

/**
 * Signature v value validator (27 or 28)
 */
const signatureV = z
  .number()
  .refine((v) => v === 27 || v === 28, 'v must be 27 or 28');

// ============================================
// API Route Schemas
// ============================================

/**
 * Submit Transfer Schema (EIP-3009 transferWithAuthorization)
 * POST /api/submit-transfer
 */
export const submitTransferSchema = z.object({
  from: ethereumAddress,
  to: ethereumAddress,
  value: z.string().min(1, 'Value is required'),
  validAfter: z.number().int().min(0).default(0),
  validBefore: z.number().int().min(0).default(9999999999),
  nonce: bytes32,
  v: signatureV,
  r: bytes32,
  s: bytes32,
});

export type SubmitTransferInput = z.infer<typeof submitTransferSchema>;

/**
 * Claim Schema
 * POST /api/claims
 */
export const claimSchema = z
  .object({
    senderAddress: ethereumAddress,
    senderEmail: email.optional(),
    recipientEmail: email.optional(),
    recipientPhone: phone.optional(),
    authorization: z.object({}).passthrough(),
    amount: positiveAmount,
    memo: z.string().max(500, 'Memo must be 500 characters or less').optional(),
  })
  .refine(
    (data) => data.recipientEmail || data.recipientPhone,
    {
      message: 'Either recipientEmail or recipientPhone is required',
      path: ['recipientEmail'],
    }
  );

export type ClaimInput = z.infer<typeof claimSchema>;

/**
 * Payment Link Schema
 * POST /api/payment-links
 */
export const paymentLinkSchema = z.object({
  creatorAddress: ethereumAddress,
  creatorEmail: email.optional(),
  amount: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // Optional
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      },
      'Amount must be greater than 0'
    ),
  memo: z.string().max(500, 'Memo must be 500 characters or less').optional(),
  expiresInDays: z.number().int().positive().optional(),
});

export type PaymentLinkInput = z.infer<typeof paymentLinkSchema>;

/**
 * Payment Request Schema
 * POST /api/requests
 */
export const paymentRequestSchema = z.object({
  fromAddress: ethereumAddress,
  fromEmail: email.optional(),
  toIdentifier: z
    .string()
    .min(1, 'Recipient identifier is required'),
  amount: positiveAmount,
  memo: z.string().max(500, 'Memo must be 500 characters or less').optional(),
  expiresInDays: z.number().int().positive().optional(),
});

export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;

// ============================================
// Validation Utilities
// ============================================

/**
 * Field errors structure
 */
export interface FieldErrors {
  [field: string]: string[];
}

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; fieldErrors: FieldErrors } };

/**
 * Validate request data against a schema
 */
export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format errors into field-level structure
  const fieldErrors: FieldErrors = {};

  for (const issue of result.error.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : '_root';
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return {
    success: false,
    error: {
      message: 'Validation failed',
      fieldErrors,
    },
  };
}

/**
 * ValidationError class for throwing validation errors
 */
export class ValidationError extends Error {
  fieldErrors: FieldErrors;

  constructor(fieldErrors: FieldErrors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }

  toJSON() {
    return {
      error: 'Validation failed',
      fieldErrors: this.fieldErrors,
    };
  }
}
