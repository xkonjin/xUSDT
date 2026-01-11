/**
 * Stream Input Validation
 * 
 * Uses Zod for schema validation of stream operations.
 * STREAM-004: Add input validation to API routes
 */

import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

/**
 * Ethereum address validation regex
 */
export const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

/**
 * Duration limits
 */
const MIN_DURATION = 60 * 60; // 1 hour in seconds
const MAX_DURATION = 10 * 365 * 24 * 60 * 60; // 10 years in seconds

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for stream creation request
 */
export const streamCreateSchema = z.object({
  sender: z.string().regex(ethereumAddressRegex, 'Invalid sender address format'),
  recipient: z.string().regex(ethereumAddressRegex, 'Invalid recipient address format'),
  depositAmount: z.string()
    .min(1, 'Deposit amount is required')
    .refine((val) => {
      try {
        const num = BigInt(val);
        return num > 0n;
      } catch {
        return false;
      }
    }, 'Deposit amount must be a positive number'),
  duration: z.number()
    .int('Duration must be an integer')
    .min(MIN_DURATION, `Duration must be at least 1 hour (${MIN_DURATION} seconds)`)
    .max(MAX_DURATION, `Duration must be at most 10 years (${MAX_DURATION} seconds)`),
  cliffDuration: z.number().int().min(0).optional().default(0),
  cancelable: z.boolean().optional().default(true),
}).refine((data) => data.sender.toLowerCase() !== data.recipient.toLowerCase(), {
  message: 'Sender and recipient cannot be the same address',
  path: ['recipient'],
});

export type StreamCreateInput = z.infer<typeof streamCreateSchema>;

/**
 * Schema for withdraw request
 */
export const withdrawSchema = z.object({
  streamId: z.string().min(1, 'Stream ID is required'),
  recipientAddress: z.string().regex(ethereumAddressRegex, 'Invalid recipient address format'),
});

export type WithdrawInput = z.infer<typeof withdrawSchema>;

/**
 * Schema for cancel request
 */
export const cancelSchema = z.object({
  streamId: z.string().min(1, 'Stream ID is required'),
  senderAddress: z.string().regex(ethereumAddressRegex, 'Invalid sender address format'),
});

export type CancelInput = z.infer<typeof cancelSchema>;

// =============================================================================
// Validation Error
// =============================================================================

/**
 * Custom validation error with field-level errors
 */
export class ValidationError extends Error {
  public errors: Array<{ field: string; message: string }>;
  
  constructor(errors: Array<{ field: string; message: string }>) {
    const message = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate stream creation input.
 * 
 * @param input - Raw input data
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateStreamCreate(input: unknown): StreamCreateInput {
  const result = streamCreateSchema.safeParse(input);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new ValidationError(errors);
  }
  
  return result.data;
}

/**
 * Validate withdraw request input.
 * 
 * @param input - Raw input data
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateWithdraw(input: unknown): WithdrawInput {
  const result = withdrawSchema.safeParse(input);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new ValidationError(errors);
  }
  
  return result.data;
}

/**
 * Validate cancel request input.
 * 
 * @param input - Raw input data
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateCancel(input: unknown): CancelInput {
  const result = cancelSchema.safeParse(input);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new ValidationError(errors);
  }
  
  return result.data;
}
