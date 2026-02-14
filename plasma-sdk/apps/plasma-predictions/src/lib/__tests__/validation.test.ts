/**
 * Unit its for validation.ts utility functions
 */

import {
  validateEthereumAddress,
  validateBetAmount,
  validateMarketId,
  validateOutcome,
  sanitizeSearchQuery,
} from "../validation";

describe("validateEthereumAddress", () => {
  it("validates correct addresses", () => {
    expect(
      validateEthereumAddress("0x1234567890123456789012345678901234567890")
    ).toEqual({
      valid: true,
    });
    expect(
      validateEthereumAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
    ).toEqual({
      valid: true,
    });
  });

  it("rejects invalid addresses", () => {
    expect(validateEthereumAddress("")).toEqual({
      valid: false,
      error: "Address is required",
    });
    expect(validateEthereumAddress("not-an-address")).toEqual({
      valid: false,
      error: "Invalid Ethereum address format",
    });
    expect(validateEthereumAddress("0x123")).toEqual({
      valid: false,
      error: "Invalid Ethereum address format",
    });
  });
});

describe("validateBetAmount", () => {
  it("validates correct amounts", () => {
    expect(validateBetAmount(10, 100)).toEqual({ valid: true });
    expect(validateBetAmount(1, 1000)).toEqual({ valid: true });
    expect(validateBetAmount(1000, 10000)).toEqual({ valid: true });
  });

  it("rejects amounts below minimum", () => {
    expect(validateBetAmount(0.5, 100)).toEqual({
      valid: false,
      error: "Minimum bet is $1",
    });
  });

  it("rejects amounts above maximum", () => {
    expect(validateBetAmount(2_000_000, 10_000_000)).toEqual({
      valid: false,
      error: "Maximum bet is $1,000,000",
    });
  });

  it("rejects amounts exceeding balance", () => {
    expect(validateBetAmount(100, 50)).toEqual({
      valid: false,
      error: "Insufficient balance",
    });
  });

  it("rejects invalid amounts", () => {
    expect(validateBetAmount(0, 100)).toEqual({
      valid: false,
      error: "Amount must be greater than 0",
    });
    expect(validateBetAmount(-10, 100)).toEqual({
      valid: false,
      error: "Amount must be greater than 0",
    });
    expect(validateBetAmount(NaN, 100)).toEqual({
      valid: false,
      error: "Amount must be greater than 0",
    });
  });
});

describe("validateMarketId", () => {
  it("validates correct market IDs", () => {
    expect(validateMarketId("will-trump-win-2024")).toEqual({ valid: true });
    expect(validateMarketId("market_123")).toEqual({ valid: true });
    expect(validateMarketId("ABC123")).toEqual({ valid: true });
  });

  it("rejects empty market ID", () => {
    expect(validateMarketId("")).toEqual({
      valid: false,
      error: "Market ID is required",
    });
  });

  it("rejects invalid characters", () => {
    expect(validateMarketId("market<script>")).toEqual({
      valid: false,
      error: "Invalid market ID format",
    });
    expect(validateMarketId("market id")).toEqual({
      valid: false,
      error: "Invalid market ID format",
    });
  });

  it("rejects too long IDs", () => {
    const longId = "a".repeat(256);
    expect(validateMarketId(longId)).toEqual({
      valid: false,
      error: "Market ID too long",
    });
  });
});

describe("validateOutcome", () => {
  it("validates correct outcomes", () => {
    expect(validateOutcome("YES")).toEqual({ valid: true });
    expect(validateOutcome("NO")).toEqual({ valid: true });
    expect(validateOutcome("Yes")).toEqual({ valid: true });
    expect(validateOutcome("No")).toEqual({ valid: true });
    expect(validateOutcome("yes")).toEqual({ valid: true });
    expect(validateOutcome("no")).toEqual({ valid: true });
  });

  it("rejects invalid outcomes", () => {
    expect(validateOutcome("MAYBE")).toEqual({
      valid: false,
      error: "Outcome must be YES or NO",
    });
    expect(validateOutcome("")).toEqual({
      valid: false,
      error: "Outcome must be YES or NO",
    });
  });
});

describe("sanitizeSearchQuery", () => {
  it("removes dangerous characters", () => {
    expect(sanitizeSearchQuery("<script>alert('xss')</script>")).toBe(
      "scriptalert('xss')/script"
    );
    expect(sanitizeSearchQuery("normal query")).toBe("normal query");
    expect(sanitizeSearchQuery("it{injection}")).toBe("itinjection");
  });

  it("trims whitespace", () => {
    expect(sanitizeSearchQuery("  hello world  ")).toBe("hello world");
  });

  it("limits length", () => {
    const longQuery = "a".repeat(300);
    expect(sanitizeSearchQuery(longQuery).length).toBe(200);
  });
});
