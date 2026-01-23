import {
  validateAmount,
  validateAddress,
  validateEmail,
  toAtomic,
  fromAtomic,
  formatAmount,
} from '../validation';

describe('validateAmount', () => {
  it('should validate positive amounts', () => {
    const result = validateAmount('10.50');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty amounts', () => {
    const result = validateAmount('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount is required');
  });

  it('should reject zero amounts', () => {
    const result = validateAmount('0');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be greater than 0');
  });

  it('should reject negative amounts', () => {
    const result = validateAmount('-5');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be greater than 0');
  });

  it('should reject invalid number formats', () => {
    const result = validateAmount('abc');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Amount must be a valid number');
  });

  it('should check against balance', () => {
    const balance = BigInt(1000000); // 1 USDT0
    const result = validateAmount('2', balance, 6);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient balance');
  });

  it('should pass when amount is within balance', () => {
    const balance = BigInt(10000000); // 10 USDT0
    const result = validateAmount('5', balance, 6);
    expect(result.valid).toBe(true);
  });
});

describe('validateAddress', () => {
  it('should validate correct Ethereum addresses', () => {
    const result = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    expect(result.valid).toBe(true);
  });

  it('should reject empty addresses', () => {
    const result = validateAddress('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Address is required');
  });

  it('should reject addresses without 0x prefix', () => {
    const result = validateAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid Ethereum address format');
  });

  it('should reject addresses with wrong length', () => {
    const result = validateAddress('0x123');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid Ethereum address format');
  });

  it('should reject addresses with invalid characters', () => {
    const result = validateAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEg');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid Ethereum address format');
  });
});

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    const result = validateEmail('user@example.com');
    expect(result.valid).toBe(true);
  });

  it('should reject empty emails', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Email is required');
  });

  it('should reject emails without @', () => {
    const result = validateEmail('userexample.com');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('should reject emails without domain', () => {
    const result = validateEmail('user@');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('should reject emails without TLD', () => {
    const result = validateEmail('user@example');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });
});

describe('toAtomic', () => {
  it('should convert decimal to atomic units', () => {
    expect(toAtomic('1', 6)).toBe(BigInt(1000000));
    expect(toAtomic('0.1', 6)).toBe(BigInt(100000));
    expect(toAtomic('0.000001', 6)).toBe(BigInt(1));
  });

  it('should handle whole numbers', () => {
    expect(toAtomic('10', 6)).toBe(BigInt(10000000));
  });

  it('should handle trailing zeros', () => {
    expect(toAtomic('1.50', 6)).toBe(BigInt(1500000));
  });

  it('should truncate excess decimals', () => {
    expect(toAtomic('1.1234567', 6)).toBe(BigInt(1123456));
  });
});

describe('fromAtomic', () => {
  it('should convert atomic units to decimal', () => {
    expect(fromAtomic(BigInt(1000000), 6)).toBe('1.000000');
    expect(fromAtomic(BigInt(100000), 6)).toBe('0.100000');
    expect(fromAtomic(BigInt(1), 6)).toBe('0.000001');
  });

  it('should handle zero', () => {
    expect(fromAtomic(BigInt(0), 6)).toBe('0.000000');
  });

  it('should handle large numbers', () => {
    expect(fromAtomic(BigInt(1234567890), 6)).toBe('1234.567890');
  });
});

describe('formatAmount', () => {
  it('should format amounts with commas', () => {
    expect(formatAmount('1000')).toBe('1,000.00');
    expect(formatAmount('1000000')).toBe('1,000,000.00');
  });

  it('should handle decimal amounts', () => {
    expect(formatAmount('1234.56')).toBe('1,234.56');
  });

  it('should handle bigint input', () => {
    expect(formatAmount(BigInt(1000000), 6)).toBe('1.00');
  });

  it('should handle invalid input', () => {
    expect(formatAmount('invalid')).toBe('0.00');
  });
});
