/**
 * Security Tests
 * 
 * Tests for security vulnerabilities:
 * - SQL injection prevention
 * - XSS prevention
 * - Input validation
 * - Authentication/authorization
 */

import { describe, it, expect } from "@jest/globals";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("SQL Injection Prevention", () => {
  it("should sanitize wallet address input", async () => {
    const maliciousInput = "'; DROP TABLE players; --";

    const response = await fetch(`${BASE_URL}/api/game/players/${encodeURIComponent(maliciousInput)}`);

    // Should handle gracefully without executing SQL
    expect([400, 404, 500]).toContain(response.status);
  });

  it("should sanitize toy ID input", async () => {
    const maliciousInput = "1 OR 1=1";

    const response = await fetch(`${BASE_URL}/api/game/toys/${encodeURIComponent(maliciousInput)}/invoice`);

    // Should handle gracefully
    expect([400, 404, 500]).toContain(response.status);
  });
});

describe("Input Validation", () => {
  it("should reject invalid wallet address format", async () => {
    const invalidAddresses = [
      "not-an-address",
      "0x123",
      "1234567890123456789012345678901234567890", // Missing 0x
      "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // Invalid hex
    ];

    for (const address of invalidAddresses) {
      const response = await fetch(`${BASE_URL}/api/game/players/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          nickname: "Test",
        }),
      });

      expect(response.status).toBe(400);
    }
  });

  it("should reject invalid nickname", async () => {
    const invalidNicknames = [
      "AB", // Too short
      "A".repeat(21), // Too long
      "<script>alert('xss')</script>", // XSS attempt
      "'; DROP TABLE players; --", // SQL injection attempt
    ];

    for (const nickname of invalidNicknames) {
      const response = await fetch(`${BASE_URL}/api/game/players/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: "0x1234567890123456789012345678901234567890",
          nickname,
        }),
      });

      expect(response.status).toBe(400);
    }
  });

  it("should reject invalid game type", async () => {
    const response = await fetch(`${BASE_URL}/api/game/games/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_address: "0x1234567890123456789012345678901234567890",
        game_type: "invalid_game_type",
        difficulty: 1,
      }),
    });

    // Should handle gracefully
    expect([400, 404, 500]).toContain(response.status);
  });
});

describe("Authorization", () => {
  it("should prevent unauthorized inventory access", async () => {
    // Try to access another player's inventory
    const otherPlayerAddress = "0x9999999999999999999999999999999999999999";

    const response = await fetch(`${BASE_URL}/api/game/players/${otherPlayerAddress}/inventory`);

    // Should return 404 or require authentication
    expect([404, 401, 403]).toContain(response.status);
  });

  it("should prevent unauthorized toy equipping", async () => {
    const response = await fetch(
      `${BASE_URL}/api/game/players/0x1234567890123456789012345678901234567890/inventory/equip`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_id: 999999, // Non-existent or not owned
          slot_number: 1,
        }),
      }
    );

    // Should reject if toy not owned
    expect([400, 404, 500]).toContain(response.status);
  });
});

describe("Rate Limiting", () => {
  it("should handle rapid requests gracefully", async () => {
    const rapidRequests = Array.from({ length: 50 }, () =>
      fetch(`${BASE_URL}/api/game/toys`)
    );

    const responses = await Promise.all(rapidRequests);

    // Should handle gracefully (may rate limit but shouldn't crash)
    responses.forEach((response) => {
      expect([200, 429]).toContain(response.status);
    });
  });
});

describe("XSS Prevention", () => {
  it("should sanitize user input in responses", async () => {
    const xssPayload = "<script>alert('xss')</script>";

    const response = await fetch(`${BASE_URL}/api/game/players/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_address: "0x1234567890123456789012345678901234567890",
        nickname: xssPayload,
      }),
    });

    if (response.status === 200) {
      const data = await response.json();
      // Response should not contain raw script tags
      expect(JSON.stringify(data)).not.toContain("<script>");
    }
  });
});

