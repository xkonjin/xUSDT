/**
 * Short Codes Tests
 * 
 * Tests for short code generation utilities
 */

import {
  generateShortCode,
  generateReferralCode,
  isValidShortCode,
} from '../short-codes';

describe('generateShortCode', () => {
  it('generates code of default length (6)', () => {
    const code = generateShortCode();
    expect(code.length).toBe(6);
  });

  it('generates code of custom length', () => {
    expect(generateShortCode(8).length).toBe(8);
    expect(generateShortCode(4).length).toBe(4);
    expect(generateShortCode(12).length).toBe(12);
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateShortCode());
    }
    // All 100 codes should be unique
    expect(codes.size).toBe(100);
  });

  it('generates URL-safe codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateShortCode();
      // Should not contain characters that need URL encoding
      expect(encodeURIComponent(code)).toBe(code);
    }
  });

  it('does not contain confusing characters', () => {
    // Generate many codes to ensure we test the alphabet
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode(20); // Longer to test more chars
      // Should not contain 0, O, 1, l, I (confusing characters)
      expect(code).not.toMatch(/[0O1lI]/);
    }
  });

  it('contains only valid alphabet characters', () => {
    const validChars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    for (let i = 0; i < 50; i++) {
      const code = generateShortCode();
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    }
  });
});

describe('generateReferralCode', () => {
  it('generates code of length 8', () => {
    const code = generateReferralCode();
    expect(code.length).toBe(8);
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    expect(codes.size).toBe(100);
  });

  it('is URL-safe', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReferralCode();
      expect(encodeURIComponent(code)).toBe(code);
    }
  });

  it('does not contain confusing characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateReferralCode();
      expect(code).not.toMatch(/[0O1lI]/);
    }
  });
});

describe('isValidShortCode', () => {
  it('returns true for valid short codes', () => {
    // Uses only valid alphabet chars (excludes 0, 1, O, l, I, o, i)
    expect(isValidShortCode('abc234')).toBe(true);
    expect(isValidShortCode('ABCDEF')).toBe(true);
    expect(isValidShortCode('test')).toBe(true);
    expect(isValidShortCode('23456789')).toBe(true);
  });

  it('returns true for generated codes', () => {
    for (let i = 0; i < 50; i++) {
      expect(isValidShortCode(generateShortCode())).toBe(true);
      expect(isValidShortCode(generateReferralCode())).toBe(true);
    }
  });

  it('returns false for empty string', () => {
    expect(isValidShortCode('')).toBe(false);
  });

  it('returns false for too short codes', () => {
    expect(isValidShortCode('abc')).toBe(false);
    expect(isValidShortCode('ab')).toBe(false);
    expect(isValidShortCode('a')).toBe(false);
  });

  it('returns false for too long codes', () => {
    expect(isValidShortCode('abcdefghijklm')).toBe(false); // 13 chars
    expect(isValidShortCode('abcdefghijklmnop')).toBe(false); // 16 chars
  });

  it('returns true for codes at boundary lengths', () => {
    expect(isValidShortCode('abcd')).toBe(true); // 4 chars (min)
    expect(isValidShortCode('abcdefghABCD')).toBe(true); // 12 chars (max, no i/o chars)
  });

  it('returns false for codes with invalid characters', () => {
    expect(isValidShortCode('abc-234')).toBe(false); // hyphen
    expect(isValidShortCode('abc_234')).toBe(false); // underscore
    expect(isValidShortCode('abc 234')).toBe(false); // space
    expect(isValidShortCode('abc!@#')).toBe(false); // special chars
    expect(isValidShortCode('abcOOO')).toBe(false); // contains O
    expect(isValidShortCode('abc000')).toBe(false); // contains 0
    expect(isValidShortCode('abclll')).toBe(false); // contains l
    expect(isValidShortCode('abcIII')).toBe(false); // contains I
    expect(isValidShortCode('abc111')).toBe(false); // contains 1
    expect(isValidShortCode('abcooo')).toBe(false); // contains lowercase o
    expect(isValidShortCode('abciii')).toBe(false); // contains lowercase i
  });

  it('is case-sensitive for valid alphabet', () => {
    // Both upper and lower case (except excluded chars) should be valid
    expect(isValidShortCode('ABCDef')).toBe(true);
    expect(isValidShortCode('abcDEF')).toBe(true);
  });
});
