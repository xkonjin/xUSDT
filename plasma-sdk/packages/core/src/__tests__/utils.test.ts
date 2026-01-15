/**
 * Utils Tests
 * 
 * Tests for utility functions from @plasma-pay/core
 */

import {
  formatUSDT0,
  parseUSDT0,
  formatTokenAmount,
  parseTokenAmount,
  generateNonce,
  getCurrentTimestamp,
  getValidityWindow,
  validateAddress,
  normalizeAddress,
  shortenAddress,
  calculatePercentage,
  splitSignature,
  joinSignature,
  formatDuration,
  parseDuration,
  calculateRatePerSecond,
  calculateUnlockedAmount,
  formatUSD,
  sleep,
  retry,
} from '../utils';

describe('formatUSDT0', () => {
  it('formats atomic units to human-readable', () => {
    expect(formatUSDT0(1000000n)).toBe('1');
    expect(formatUSDT0(1500000n)).toBe('1.5');
    expect(formatUSDT0(123456n)).toBe('0.123456');
  });

  it('handles zero', () => {
    expect(formatUSDT0(0n)).toBe('0');
  });

  it('handles large amounts', () => {
    expect(formatUSDT0(1000000000000n)).toBe('1000000');
  });
});

describe('parseUSDT0', () => {
  it('parses human-readable to atomic units', () => {
    expect(parseUSDT0('1')).toBe(1000000n);
    expect(parseUSDT0('1.5')).toBe(1500000n);
    expect(parseUSDT0('0.123456')).toBe(123456n);
  });

  it('handles zero', () => {
    expect(parseUSDT0('0')).toBe(0n);
  });
});

describe('formatTokenAmount', () => {
  it('formats with custom decimals', () => {
    expect(formatTokenAmount(1000000000000000000n, 18)).toBe('1');
    expect(formatTokenAmount(1000000n, 6)).toBe('1');
  });
});

describe('parseTokenAmount', () => {
  it('parses with custom decimals', () => {
    expect(parseTokenAmount('1', 18)).toBe(1000000000000000000n);
    expect(parseTokenAmount('1', 6)).toBe(1000000n);
  });
});

describe('generateNonce', () => {
  it('generates valid bytes32 hex string', () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it('generates unique nonces', () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    expect(nonce1).not.toBe(nonce2);
  });
});

describe('getCurrentTimestamp', () => {
  it('returns current timestamp in seconds', () => {
    const before = Math.floor(Date.now() / 1000);
    const timestamp = getCurrentTimestamp();
    const after = Math.floor(Date.now() / 1000);
    
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('returns an integer', () => {
    const timestamp = getCurrentTimestamp();
    expect(Number.isInteger(timestamp)).toBe(true);
  });
});

describe('getValidityWindow', () => {
  it('returns validAfter and validBefore', () => {
    const window = getValidityWindow();
    expect(window).toHaveProperty('validAfter');
    expect(window).toHaveProperty('validBefore');
  });

  it('validBefore is greater than validAfter', () => {
    const window = getValidityWindow();
    expect(window.validBefore).toBeGreaterThan(window.validAfter);
  });

  it('uses default validity period of 1 hour', () => {
    const window = getValidityWindow();
    expect(window.validBefore - window.validAfter).toBe(3600);
  });

  it('accepts custom validity period', () => {
    const window = getValidityWindow(7200); // 2 hours
    expect(window.validBefore - window.validAfter).toBe(7200);
  });
});

describe('validateAddress', () => {
  it('returns true for valid Ethereum addresses', () => {
    expect(validateAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    expect(validateAddress('0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb')).toBe(true);
  });

  it('returns false for invalid addresses', () => {
    expect(validateAddress('invalid')).toBe(false);
    expect(validateAddress('0x123')).toBe(false);
    expect(validateAddress('')).toBe(false);
  });
});

describe('normalizeAddress', () => {
  it('converts to checksum format', () => {
    const lowercaseAddress = '0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb';
    const checksumAddress = normalizeAddress(lowercaseAddress);
    expect(checksumAddress).toBe('0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb');
  });

  it('throws for invalid addresses', () => {
    expect(() => normalizeAddress('invalid')).toThrow('Invalid address');
  });
});

describe('shortenAddress', () => {
  it('shortens address with default chars', () => {
    const result = shortenAddress('0x1234567890123456789012345678901234567890');
    expect(result).toBe('0x1234...7890');
  });

  it('accepts custom char count', () => {
    const result = shortenAddress('0x1234567890123456789012345678901234567890', 6);
    expect(result).toBe('0x123456...567890');
  });

  it('handles empty string', () => {
    expect(shortenAddress('')).toBe('');
  });
});

describe('calculatePercentage', () => {
  it('calculates percentage correctly', () => {
    expect(calculatePercentage(50n, 100n)).toBe(50);
    expect(calculatePercentage(1n, 4n)).toBe(25);
    expect(calculatePercentage(1n, 3n)).toBeCloseTo(33.33, 1);
  });

  it('returns 0 for zero total', () => {
    expect(calculatePercentage(50n, 0n)).toBe(0);
  });
});

describe('splitSignature', () => {
  it('splits signature into v, r, s', () => {
    const signature = '0x' + 'a'.repeat(64) + 'b'.repeat(64) + '1b' as `0x${string}`;
    const { v, r, s } = splitSignature(signature);
    
    expect(r).toBe('0x' + 'a'.repeat(64));
    expect(s).toBe('0x' + 'b'.repeat(64));
    expect(v).toBe(27);
  });

  it('handles EIP-155 v values', () => {
    const signature = '0x' + 'a'.repeat(64) + 'b'.repeat(64) + '00' as `0x${string}`;
    const { v } = splitSignature(signature);
    expect(v).toBe(27);
  });
});

describe('joinSignature', () => {
  it('joins v, r, s into signature', () => {
    const r = '0x' + 'a'.repeat(64) as `0x${string}`;
    const s = '0x' + 'b'.repeat(64) as `0x${string}`;
    const v = 27;
    
    const signature = joinSignature(v, r, s);
    expect(signature).toMatch(/^0x[a-fA-F0-9]+$/);
    expect(signature.length).toBe(132); // 0x + 64 + 64 + 2
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(30)).toBe('30s');
  });

  it('formats minutes', () => {
    expect(formatDuration(120)).toBe('2m');
  });

  it('formats hours', () => {
    expect(formatDuration(7200)).toBe('2h');
  });

  it('formats days', () => {
    expect(formatDuration(172800)).toBe('2d');
  });

  it('formats months', () => {
    expect(formatDuration(5184000)).toBe('2mo');
  });
});

describe('parseDuration', () => {
  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30);
  });

  it('parses minutes', () => {
    expect(parseDuration('2m')).toBe(120);
  });

  it('parses hours', () => {
    expect(parseDuration('2h')).toBe(7200);
  });

  it('parses days', () => {
    expect(parseDuration('2d')).toBe(172800);
  });

  it('parses weeks', () => {
    expect(parseDuration('1w')).toBe(604800);
  });

  it('parses months', () => {
    expect(parseDuration('1mo')).toBe(2592000);
  });

  it('parses years', () => {
    expect(parseDuration('1y')).toBe(31536000);
  });

  it('throws for invalid duration', () => {
    expect(() => parseDuration('invalid')).toThrow('Invalid duration');
  });
});

describe('calculateRatePerSecond', () => {
  it('calculates rate without cliff', () => {
    const rate = calculateRatePerSecond(1000000n, 100, 0);
    expect(rate).toBe(10000n);
  });

  it('calculates rate with cliff', () => {
    const rate = calculateRatePerSecond(1000000n, 100, 50);
    // 50% cliff means only 500000 is streamed over 100 seconds
    expect(rate).toBe(5000n);
  });

  it('returns 0 for zero duration', () => {
    expect(calculateRatePerSecond(1000000n, 0, 0)).toBe(0n);
  });
});

describe('calculateUnlockedAmount', () => {
  const now = Math.floor(Date.now() / 1000);
  
  it('returns 0 before cliff', () => {
    const unlocked = calculateUnlockedAmount(
      1000000n,
      now - 100,
      now + 900,
      now + 100, // cliff in future
      100000n,
      1000n,
      now
    );
    expect(unlocked).toBe(0n);
  });

  it('returns full amount after end time', () => {
    const unlocked = calculateUnlockedAmount(
      1000000n,
      now - 2000,
      now - 1000, // ended
      now - 1500,
      100000n,
      1000n,
      now
    );
    expect(unlocked).toBe(1000000n);
  });

  it('calculates streamed amount correctly', () => {
    const startTime = now - 200;
    const cliffTime = now - 100;
    const endTime = now + 800;
    const cliffAmount = 100000n;
    const ratePerSecond = 1000n;
    
    const unlocked = calculateUnlockedAmount(
      1000000n,
      startTime,
      endTime,
      cliffTime,
      cliffAmount,
      ratePerSecond,
      now
    );
    
    // Time after cliff = 100 seconds
    // Expected = cliffAmount + (100 * ratePerSecond) = 100000 + 100000 = 200000
    expect(unlocked).toBe(200000n);
  });
});

describe('formatUSD', () => {
  it('formats as USD currency', () => {
    expect(formatUSD(1234.56)).toBe('$1,234.56');
    expect(formatUSD('99.99')).toBe('$99.99');
  });

  it('handles zero', () => {
    expect(formatUSD(0)).toBe('$0.00');
  });
});

describe('sleep', () => {
  it('delays execution', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
  });
});

describe('retry', () => {
  it('returns result on success', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    
    const result = await retry(fn, 3, 10);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    
    await expect(retry(fn, 2, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
