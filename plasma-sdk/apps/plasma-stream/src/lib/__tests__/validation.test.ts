/**
 * Stream Input Validation Tests
 * 
 * TDD tests for Zod schemas and stream validation
 */

import {
  streamCreateSchema,
  withdrawSchema,
  cancelSchema,
  ethereumAddressRegex,
  validateStreamCreate,
  validateWithdraw,
  validateCancel,
  ValidationError,
} from '../validation';

describe('ethereumAddressRegex', () => {
  it('matches valid Ethereum addresses', () => {
    expect('0x1234567890123456789012345678901234567890').toMatch(ethereumAddressRegex);
    expect('0xdEc34d821a100ae7a632cAF36161C5651D0d5dF9').toMatch(ethereumAddressRegex);
  });

  it('rejects invalid addresses', () => {
    expect('0x123').not.toMatch(ethereumAddressRegex);
    expect('invalid-address').not.toMatch(ethereumAddressRegex);
    expect('1234567890123456789012345678901234567890').not.toMatch(ethereumAddressRegex);
  });
});

describe('streamCreateSchema', () => {
  const validStream = {
    sender: '0x1234567890123456789012345678901234567890',
    recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    depositAmount: '1000000000', // 1000 USDT
    duration: 3600, // 1 hour
  };

  it('validates a correct stream', () => {
    const result = streamCreateSchema.safeParse(validStream);
    expect(result.success).toBe(true);
  });

  it('requires sender address', () => {
    const { sender, ...streamWithoutSender } = validStream;
    const result = streamCreateSchema.safeParse(streamWithoutSender);
    expect(result.success).toBe(false);
  });

  it('requires recipient address', () => {
    const { recipient, ...streamWithoutRecipient } = validStream;
    const result = streamCreateSchema.safeParse(streamWithoutRecipient);
    expect(result.success).toBe(false);
  });

  it('validates sender address format', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      sender: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('validates recipient address format', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      recipient: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('requires depositAmount', () => {
    const { depositAmount, ...streamWithoutAmount } = validStream;
    const result = streamCreateSchema.safeParse(streamWithoutAmount);
    expect(result.success).toBe(false);
  });

  it('requires duration', () => {
    const { duration, ...streamWithoutDuration } = validStream;
    const result = streamCreateSchema.safeParse(streamWithoutDuration);
    expect(result.success).toBe(false);
  });

  it('validates minimum duration (1 hour)', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      duration: 60, // Only 1 minute
    });
    expect(result.success).toBe(false);
  });

  it('validates maximum duration (10 years)', () => {
    const elevenYears = 11 * 365 * 24 * 60 * 60;
    const result = streamCreateSchema.safeParse({
      ...validStream,
      duration: elevenYears,
    });
    expect(result.success).toBe(false);
  });

  it('rejects sender same as recipient', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      recipient: validStream.sender,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional cliffDuration', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      cliffDuration: 1800, // 30 minutes
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional cancelable flag', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      cancelable: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelable).toBe(false);
    }
  });

  it('defaults cancelable to true', () => {
    const result = streamCreateSchema.safeParse(validStream);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelable).toBe(true);
    }
  });

  it('validates depositAmount is a positive numeric string', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      depositAmount: '-100',
    });
    expect(result.success).toBe(false);
  });

  it('validates depositAmount is at least 1', () => {
    const result = streamCreateSchema.safeParse({
      ...validStream,
      depositAmount: '0',
    });
    expect(result.success).toBe(false);
  });
});

describe('withdrawSchema', () => {
  const validWithdraw = {
    streamId: 'stream-123',
    recipientAddress: '0x1234567890123456789012345678901234567890',
  };

  it('validates a correct withdraw request', () => {
    const result = withdrawSchema.safeParse(validWithdraw);
    expect(result.success).toBe(true);
  });

  it('requires streamId', () => {
    const { streamId, ...withoutStreamId } = validWithdraw;
    const result = withdrawSchema.safeParse(withoutStreamId);
    expect(result.success).toBe(false);
  });

  it('requires recipientAddress', () => {
    const { recipientAddress, ...withoutRecipient } = validWithdraw;
    const result = withdrawSchema.safeParse(withoutRecipient);
    expect(result.success).toBe(false);
  });

  it('validates recipientAddress format', () => {
    const result = withdrawSchema.safeParse({
      ...validWithdraw,
      recipientAddress: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('requires non-empty streamId', () => {
    const result = withdrawSchema.safeParse({
      ...validWithdraw,
      streamId: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('cancelSchema', () => {
  const validCancel = {
    streamId: 'stream-123',
    senderAddress: '0x1234567890123456789012345678901234567890',
  };

  it('validates a correct cancel request', () => {
    const result = cancelSchema.safeParse(validCancel);
    expect(result.success).toBe(true);
  });

  it('requires streamId', () => {
    const { streamId, ...withoutStreamId } = validCancel;
    const result = cancelSchema.safeParse(withoutStreamId);
    expect(result.success).toBe(false);
  });

  it('requires senderAddress', () => {
    const { senderAddress, ...withoutSender } = validCancel;
    const result = cancelSchema.safeParse(withoutSender);
    expect(result.success).toBe(false);
  });

  it('validates senderAddress format', () => {
    const result = cancelSchema.safeParse({
      ...validCancel,
      senderAddress: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('validateStreamCreate', () => {
  it('returns validated data for valid input', () => {
    const input = {
      sender: '0x1234567890123456789012345678901234567890',
      recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      depositAmount: '1000000',
      duration: 3600,
    };
    
    const result = validateStreamCreate(input);
    expect(result.sender).toBe(input.sender);
    expect(result.recipient).toBe(input.recipient);
  });

  it('throws ValidationError for invalid input', () => {
    const input = {
      sender: 'invalid',
      recipient: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      depositAmount: '1000000',
      duration: 3600,
    };
    
    expect(() => validateStreamCreate(input)).toThrow(ValidationError);
  });

  it('includes field errors in ValidationError', () => {
    const input = {
      sender: 'invalid',
      duration: -1,
    };
    
    try {
      validateStreamCreate(input);
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('validateWithdraw', () => {
  it('returns validated data for valid input', () => {
    const input = {
      streamId: 'stream-123',
      recipientAddress: '0x1234567890123456789012345678901234567890',
    };
    
    const result = validateWithdraw(input);
    expect(result.streamId).toBe(input.streamId);
    expect(result.recipientAddress).toBe(input.recipientAddress);
  });

  it('throws ValidationError for invalid input', () => {
    expect(() => validateWithdraw({ streamId: '' })).toThrow(ValidationError);
  });
});

describe('validateCancel', () => {
  it('returns validated data for valid input', () => {
    const input = {
      streamId: 'stream-123',
      senderAddress: '0x1234567890123456789012345678901234567890',
    };
    
    const result = validateCancel(input);
    expect(result.streamId).toBe(input.streamId);
    expect(result.senderAddress).toBe(input.senderAddress);
  });

  it('throws ValidationError for invalid input', () => {
    expect(() => validateCancel({ streamId: '' })).toThrow(ValidationError);
  });
});
