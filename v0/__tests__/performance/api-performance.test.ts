/**
 * API Performance Tests
 * 
 * Tests API endpoint performance:
 * - Response times
 * - Concurrent request handling
 * - Database query performance
 */

import { describe, it, expect } from "@jest/globals";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const PERFORMANCE_THRESHOLDS = {
  fast: 200, // ms
  acceptable: 500, // ms
  slow: 1000, // ms
};

describe("API Performance Tests", () => {
  it("should respond to GET /api/game/toys within acceptable time", async () => {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/api/game/toys`);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.acceptable);
  });

  it("should handle concurrent requests to /api/game/toys", async () => {
    const concurrentRequests = 10;
    const promises = Array.from({ length: concurrentRequests }, () =>
      fetch(`${BASE_URL}/api/game/toys`)
    );

    const start = Date.now();
    const responses = await Promise.all(promises);
    const duration = Date.now() - start;

    // All requests should succeed
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    // Should handle concurrent requests efficiently
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.acceptable * concurrentRequests);
  });

  it("should respond to GET /api/game/leaderboard within acceptable time", async () => {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/api/game/leaderboard?period=weekly`);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.acceptable);
  });

  it("should respond to GET /api/game/daily-bonuses quickly", async () => {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/api/game/daily-bonuses`);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.fast);
  });

  it("should handle database queries efficiently", async () => {
    const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";

    // Test multiple queries
    const queries = [
      fetch(`${BASE_URL}/api/game/toys`),
      fetch(`${BASE_URL}/api/game/leaderboard?period=weekly`),
      fetch(`${BASE_URL}/api/game/daily-bonuses`),
      fetch(`${BASE_URL}/api/game/players/${TEST_ADDRESS}`).catch(() => null), // May 404
    ];

    const start = Date.now();
    await Promise.all(queries);
    const duration = Date.now() - start;

    // Should complete all queries quickly
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.acceptable * 2);
  });
});

describe("Load Testing", () => {
  it("should handle 100 requests without errors", async () => {
    const requests = Array.from({ length: 100 }, () =>
      fetch(`${BASE_URL}/api/game/toys`).catch(() => ({ status: 500 }))
    );

    const responses = await Promise.all(requests);
    const successCount = responses.filter((r) => r.status === 200).length;

    // At least 95% should succeed under load
    expect(successCount).toBeGreaterThan(95);
  });
});

