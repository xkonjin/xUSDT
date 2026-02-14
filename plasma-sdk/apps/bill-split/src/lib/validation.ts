/**
 * Input Validation and Sanitization
 * 
 * Uses Zod for schema validation and custom sanitization
 * to prevent XSS and other injection attacks.
 */

import { z } from 'zod';

// =============================================================================
// Sanitization Utilities
// =============================================================================

/**
 * HTML tag pattern for removal (must start with a letter or /)
 * Matches: <div>, </span>, <img />, <br/>
 * Does not match: "A < B > C" (comparison operators)
 */
const HTML_TAG_PATTERN = /<\/?[a-zA-Z][^>]*>/g;

/**
 * Script tag pattern (including content)
 */
const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/**
 * Dangerous attribute patterns
 */
const DANGEROUS_ATTRS = /\s*(on\w+|javascript:|data:)\s*=/gi;

/**
 * Sanitize a string to prevent XSS attacks.
 * 
 * - Removes script tags and content
 * - Removes HTML tags (but preserves content)
 * - Escapes HTML entities for remaining < > characters
 * - Trims whitespace
 * - Limits length
 * 
 * @param str - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized string
 */
export function sanitizeString(str: string | null | undefined, maxLength = 500): string {
  if (str == null) return '';
  
  let result = String(str);
  
  // Remove script tags and their content
  result = result.replace(SCRIPT_TAG_PATTERN, '');
  
  // Remove dangerous attributes before removing all tags
  result = result.replace(DANGEROUS_ATTRS, '');
  
  // Remove all complete HTML tags (preserving content between them)
  result = result.replace(HTML_TAG_PATTERN, '');
  
  // Escape remaining < and > characters (not part of complete tags)
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Trim whitespace
  result = result.trim();
  
  // Limit length
  if (result.length > maxLength) {
    result = result.slice(0, maxLength);
  }
  
  return result;
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Ethereum address validation regex
 */
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;

/**
 * Schema for a single bill item
 */
export const billItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Item name is required').max(200, 'Item name too long'),
  price: z.number().positive('Price must be positive'),
  quantity: z.number().int().positive('Quantity must be a positive integer').default(1),
  assignedToParticipantIds: z.array(z.string()).optional(),
});

/**
 * Schema for a bill participant
 */
export const billParticipantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Participant name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  color: z.string().optional(),
  walletAddress: z.string().regex(ethereumAddressRegex, 'Invalid wallet address').optional().nullable(),
});

/**
 * Schema for bill creation request
 */
export const billCreateSchema = z.object({
  creatorAddress: z.string().regex(ethereumAddressRegex, 'Invalid creator address'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  items: z.array(billItemSchema).min(1, 'At least one item is required'),
  participants: z.array(billParticipantSchema).min(1, 'At least one participant is required'),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  tip: z.number().min(0).optional(),
  tipPercent: z.number().min(0).max(100).optional(),
  total: z.number().min(0).optional(),
});

export type BillCreateInput = z.infer<typeof billCreateSchema>;
export type BillItem = z.infer<typeof billItemSchema>;
export type BillParticipant = z.infer<typeof billParticipantSchema>;

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
// Combined Validation and Sanitization
// =============================================================================

type GenericRecord = Record<string, unknown>;


/**
 * Sanitize bill input data.
 * 
 * @param input - Raw bill input
 * @returns Sanitized bill input
 */
export function sanitizeBillInput(input: GenericRecord): GenericRecord {
  const items = Array.isArray(input.items) ? input.items : [];
  const participants = Array.isArray(input.participants) ? input.participants : [];

  return {
    ...input,
    title: sanitizeString(input.title as string | null | undefined, 200),
    items: items.map((item) => {
      const itemRecord = item as GenericRecord;
      return {
        ...itemRecord,
        name: sanitizeString(itemRecord.name as string | null | undefined, 200),
      };
    }),
    participants: participants.map((p) => {
      const participantRecord = p as GenericRecord;
      return {
        ...participantRecord,
        name: sanitizeString(participantRecord.name as string | null | undefined, 100),
      };
    }),
  };
}

/**
 * Validate and sanitize bill creation input.
 * 
 * @param input - Raw input data
 * @returns Validated and sanitized data
 * @throws ValidationError if validation fails
 */
export function validateBillCreate(input: unknown): BillCreateInput {
  // First sanitize the input
  const sanitized = sanitizeBillInput(input as GenericRecord);
  
  // Then validate with Zod
  const result = billCreateSchema.safeParse(sanitized);
  
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
 * Validate a partial bill update.
 */
export const billUpdateSchema = billCreateSchema.partial().omit({ creatorAddress: true });

export type BillUpdateInput = z.infer<typeof billUpdateSchema>;

/**
 * Validate and sanitize bill update input.
 */
export function validateBillUpdate(input: unknown): BillUpdateInput {
  const sanitized = sanitizeBillInput(input as GenericRecord);
  const result = billUpdateSchema.safeParse(sanitized);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    throw new ValidationError(errors);
  }
  
  return result.data;
}
