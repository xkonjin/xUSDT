/**
 * Unit tests for constants.ts utility functions
 */

import { describe, expect, test } from "vitest";
import {
  formatUSDT,
  parseUSDT,
  formatPercent,
  formatPrice,
  formatTimeLeft,
  formatVolume,
  formatAddress,
} from "../constants";

describe("formatUSDT", () => {
  test("formats BigInt to USD string", () => {
    expect(formatUSDT(BigInt(1_000_000))).toBe("$1.00");
    expect(formatUSDT(BigInt(0))).toBe("$0.00");
    expect(formatUSDT(BigInt(123_456_789))).toBe("$123.46");
    expect(formatUSDT(BigInt(10_000))).toBe("$0.01");
    expect(formatUSDT(BigInt(999_999))).toBe("$1.00");
  });

  test("handles large amounts", () => {
    expect(formatUSDT(BigInt(1_000_000_000_000))).toBe("$1,000,000.00");
  });
});

describe("parseUSDT", () => {
  test("parses number to atomic units", () => {
    expect(parseUSDT(1)).toBe(BigInt(1_000_000));
    expect(parseUSDT(0.01)).toBe(BigInt(10_000));
    expect(parseUSDT(100)).toBe(BigInt(100_000_000));
  });

  test("handles zero", () => {
    expect(parseUSDT(0)).toBe(BigInt(0));
  });

  test("handles string input", () => {
    expect(parseUSDT("1")).toBe(BigInt(1_000_000));
    expect(parseUSDT("10.50")).toBe(BigInt(10_500_000));
  });
});

describe("formatPercent", () => {
  test("formats decimal to percentage", () => {
    expect(formatPercent(0.65)).toBe("65%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0.5)).toBe("50%");
  });

  test("handles edge cases", () => {
    expect(formatPercent(0.001)).toBe("0%");
    expect(formatPercent(0.999)).toBe("100%");
  });
});

describe("formatPrice", () => {
  test("formats price in cents", () => {
    expect(formatPrice(0.65)).toBe("65¢");
    expect(formatPrice(0.05)).toBe("5¢");
    expect(formatPrice(0.99)).toBe("99¢");
  });

  test("handles edge cases", () => {
    expect(formatPrice(0)).toBe("0¢");
    expect(formatPrice(1)).toBe("100¢");
  });
});

describe("formatTimeLeft", () => {
  test("formats future dates", () => {
    const inOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = formatTimeLeft(inOneDay);
    expect(result).toMatch(/1d|23h|24h/); // Allow for timing variance
  });

  test("formats dates in hours", () => {
    const inTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const result = formatTimeLeft(inTwoHours);
    expect(result).toMatch(/1h|2h/);
  });

  test("handles ended markets", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeLeft(yesterday)).toMatch(/Ended|ago/i);
  });
});

describe("formatVolume", () => {
  test("formats large numbers with K suffix", () => {
    expect(formatVolume(50_000)).toBe("$50K");
    expect(formatVolume(100_000)).toBe("$100K");
  });

  test("formats large numbers with M suffix", () => {
    expect(formatVolume(1_500_000)).toBe("$1.5M");
    expect(formatVolume(10_000_000)).toBe("$10M");
  });

  test("formats small numbers without suffix", () => {
    expect(formatVolume(999)).toBe("$999");
    expect(formatVolume(500)).toBe("$500");
  });
});

describe("formatAddress", () => {
  test("truncates address", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const result = formatAddress(address);
    expect(result).toMatch(/0x1234.*5678/);
    expect(result.length).toBeLessThan(address.length);
  });

  test("handles custom length", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const result = formatAddress(address, 8);
    expect(result).toContain("...");
  });

  test("handles empty address", () => {
    expect(formatAddress("")).toBe("");
    expect(formatAddress("", 4)).toBe("");
  });
});
