/**
 * Players API Endpoint Tests
 * 
 * Tests for player-related endpoints:
 * - POST /api/game/players/register - Register player
 * - GET /api/game/players/[address] - Get player profile
 * - GET /api/game/players/[address]/inventory - Get inventory
 * - POST /api/game/players/[address]/inventory/equip - Equip toy
 * - POST /api/game/players/[address]/inventory/unequip - Unequip toy
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { query, transaction } from "../../../src/lib/api/db";

jest.mock("../../../src/lib/api/db", () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";

describe("POST /api/game/players/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register new player successfully", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    (transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })
          .mockResolvedValueOnce({
            rows: [
              {
                wallet_address: TEST_ADDRESS,
                nickname: "TestPlayer",
                credits_balance: 100,
                total_points: 0,
                games_played: 0,
              },
            ],
            rowCount: 1,
          }),
      };
      return callback(mockClient);
    });

    const response = await fetch("http://localhost:3000/api/game/players/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_address: TEST_ADDRESS,
        nickname: "TestPlayer",
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.wallet_address).toBe(TEST_ADDRESS);
    expect(data.nickname).toBe("TestPlayer");
    expect(data.credits_balance).toBe(100);
  });

  it("should reject invalid wallet address", async () => {
    const response = await fetch("http://localhost:3000/api/game/players/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_address: "invalid",
        nickname: "TestPlayer",
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("wallet address");
  });

  it("should reject nickname that's too short", async () => {
    const response = await fetch("http://localhost:3000/api/game/players/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_address: TEST_ADDRESS,
        nickname: "AB",
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("between 3 and 20");
  });

  it("should reject duplicate nickname", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ wallet_address: "0xOTHER" }],
      rowCount: 1,
    });

    const response = await fetch("http://localhost:3000/api/game/players/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_address: TEST_ADDRESS,
        nickname: "TakenNickname",
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("already taken");
  });
});

describe("GET /api/game/players/[address]", () => {
  it("should return player profile", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [
        {
          wallet_address: TEST_ADDRESS,
          nickname: "TestPlayer",
          credits_balance: 100,
          total_points: 500,
          games_played: 10,
        },
      ],
      rowCount: 1,
    });

    const response = await fetch(`http://localhost:3000/api/game/players/${TEST_ADDRESS}`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.wallet_address).toBe(TEST_ADDRESS);
    expect(data.nickname).toBe("TestPlayer");
    expect(data.total_points).toBe(500);
  });

  it("should return 404 for non-existent player", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await fetch(`http://localhost:3000/api/game/players/${TEST_ADDRESS}`);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("not found");
  });
});

describe("GET /api/game/players/[address]/inventory", () => {
  it("should return player inventory with equipped toys", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [
        {
          slot_number: 1,
          token_id: "1001",
          toy_name: "Robot",
          rarity: "rare",
          stats_json: { Speed: 15, Power: 12 },
          mint_number: 1,
        },
        {
          token_id: "1001",
          toy_name: "Robot",
          rarity: "rare",
          stats_json: { Speed: 15, Power: 12 },
          mint_number: 1,
          is_equipped: true,
        },
        {
          token_id: "1002",
          toy_name: "Dragon",
          rarity: "epic",
          stats_json: { Power: 20, Magic: 18 },
          mint_number: 2,
          is_equipped: false,
        },
      ],
      rowCount: 3,
    });

    const response = await fetch(`http://localhost:3000/api/game/players/${TEST_ADDRESS}/inventory`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("equipped");
    expect(data).toHaveProperty("owned");
    expect(data.equipped[1]).toBeTruthy();
    expect(data.owned.length).toBeGreaterThan(0);
  });
});

describe("POST /api/game/players/[address]/inventory/equip", () => {
  it("should equip toy to slot successfully", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ owner_address: TEST_ADDRESS }],
      rowCount: 1,
    });

    (transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      };
      return callback(mockClient);
    });

    const response = await fetch(`http://localhost:3000/api/game/players/${TEST_ADDRESS}/inventory/equip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_id: 1001,
        slot_number: 1,
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should reject equipping toy not owned by player", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ owner_address: "0xOTHER" }],
      rowCount: 1,
    });

    const response = await fetch(`http://localhost:3000/api/game/players/${TEST_ADDRESS}/inventory/equip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_id: 1001,
        slot_number: 1,
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("not owned");
  });

  it("should reject invalid slot number", async () => {
    const response = await fetch(`http://localhost:3000/api/game/players/${TEST_ADDRESS}/inventory/equip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_id: 1001,
        slot_number: 5,
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("must be 1, 2, or 3");
  });
});

