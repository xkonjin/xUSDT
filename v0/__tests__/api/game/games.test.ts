/**
 * Games API Endpoint Tests
 * 
 * Tests for game-related endpoints:
 * - POST /api/game/games/start - Start game session
 * - POST /api/game/games/submit - Submit game result
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { query, transaction } from "../../../src/lib/api/db";
import { cache } from "../../../src/lib/api/redis";

jest.mock("../../../src/lib/api/db", () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

jest.mock("../../../src/lib/api/redis", () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";

describe("POST /api/game/games/start", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should start game session successfully", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ credits_balance: 100 }],
      rowCount: 1,
    });

    (cache.set as jest.Mock).mockResolvedValue(true);

    const response = await fetch("http://localhost:3000/api/game/games/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_address: TEST_ADDRESS,
        game_type: "reaction_time",
        difficulty: 1,
        wager_type: "none",
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("challenge_id");
    expect(data).toHaveProperty("game_type", "reaction_time");
    expect(data).toHaveProperty("seed");
    expect(data).toHaveProperty("difficulty", 1);
  });

  it("should reject if player not found", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await fetch("http://localhost:3000/api/game/games/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_address: TEST_ADDRESS,
        game_type: "reaction_time",
        difficulty: 1,
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("should reject if insufficient credits", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ credits_balance: 10 }],
      rowCount: 1,
    });

    const response = await fetch("http://localhost:3000/api/game/games/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_address: TEST_ADDRESS,
        game_type: "reaction_time",
        difficulty: 1,
        wager_type: "credits",
        wager_amount: 50,
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Insufficient credits");
  });
});

describe("POST /api/game/games/submit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should submit game result and calculate points", async () => {
    const challengeData = {
      player_address: TEST_ADDRESS,
      game_type: "reaction_time",
      difficulty: 1,
      seed: 12345,
      wager_type: "none",
      created_at: Date.now(),
      expires_at: Date.now() + 300000,
    };

    (cache.get as jest.Mock).mockResolvedValue(challengeData);

    (query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [{ multiplier: 1.5 }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

    (transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      };
      return callback(mockClient);
    });

    (cache.del as jest.Mock).mockResolvedValue(true);

    const response = await fetch("http://localhost:3000/api/game/games/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge_id: "test-challenge-123",
        result_data: {
          reaction_time_ms: 250,
        },
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty("points_earned");
    expect(data).toHaveProperty("base_points");
    expect(data).toHaveProperty("toy_bonus_multiplier");
    expect(data).toHaveProperty("daily_bonus_multiplier");
    expect(data).toHaveProperty("wager_multiplier");
  });

  it("should reject if challenge not found", async () => {
    (cache.get as jest.Mock).mockResolvedValue(null);

    const response = await fetch("http://localhost:3000/api/game/games/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge_id: "invalid-challenge",
        result_data: {
          reaction_time_ms: 250,
        },
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("not found or expired");
  });

  it("should apply multipliers correctly", async () => {
    const challengeData = {
      player_address: TEST_ADDRESS,
      game_type: "reaction_time",
      difficulty: 1,
      seed: 12345,
      wager_type: "credits",
      wager_amount: 50,
      created_at: Date.now(),
      expires_at: Date.now() + 300000,
    };

    (cache.get as jest.Mock).mockResolvedValue(challengeData);

    (query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [
          { stats_json: { Speed: 15 }, stat_categories: ["Speed"] },
          { stats_json: { Power: 12 }, stat_categories: ["Power"] },
        ],
        rowCount: 2,
      })
      .mockResolvedValueOnce({
        rows: [{ multiplier: 2.0 }],
        rowCount: 1,
      });

    (transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      };
      return callback(mockClient);
    });

    (cache.del as jest.Mock).mockResolvedValue(true);

    const response = await fetch("http://localhost:3000/api/game/games/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challenge_id: "test-challenge-123",
        result_data: {
          reaction_time_ms: 250,
        },
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.points_earned).toBeGreaterThan(data.base_points);
    expect(data.toy_bonus_multiplier).toBeGreaterThan(1.0);
  });
});

