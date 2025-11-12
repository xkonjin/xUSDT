/**
 * Toys API Endpoint Tests
 * 
 * Tests for /api/game/toys endpoints:
 * - GET /api/game/toys - List all toys
 * - GET /api/game/toys/[id]/invoice - Get payment invoice
 * - POST /api/game/toys/purchase - Purchase toy
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { query } from "../../../src/lib/api/db";

// Mock database connection
jest.mock("../../../src/lib/api/db", () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

describe("GET /api/game/toys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return list of all toys with mint counts", async () => {
    const mockToys = [
      {
        id: 1,
        name: "Robot",
        base_price_usdt0: "100000",
        current_mint_count: "5",
        max_mint_per_type: 10,
      },
    ];

    (query as jest.Mock).mockResolvedValue({
      rows: mockToys,
      rowCount: 1,
    });

    const response = await fetch("http://localhost:3000/api/game/toys");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("available");
  });

  it("should handle database errors gracefully", async () => {
    (query as jest.Mock).mockRejectedValue(new Error("Database error"));

    const response = await fetch("http://localhost:3000/api/game/toys");
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty("error");
  });

  it("should calculate availability correctly", async () => {
    const mockToys = [
      {
        id: 1,
        name: "Robot",
        base_price_usdt0: "100000",
        current_mint_count: "10",
        max_mint_per_type: 10,
      },
    ];

    (query as jest.Mock).mockResolvedValue({
      rows: mockToys,
      rowCount: 1,
    });

    const response = await fetch("http://localhost:3000/api/game/toys");
    const data = await response.json();

    expect(data[0].available).toBe(false);
  });
});

describe("GET /api/game/toys/[id]/invoice", () => {
  it("should return 402 PaymentRequired with invoice", async () => {
    const mockToy = {
      id: 1,
      name: "Robot",
      base_price_usdt0: "100000",
      max_mint_per_type: 10,
    };

    (query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [mockToy],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ count: "5" }],
        rowCount: 1,
      });

    const response = await fetch("http://localhost:3000/api/game/toys/1/invoice");
    const data = await response.json();

    expect(response.status).toBe(402);
    expect(data).toHaveProperty("type", "payment-required");
    expect(data).toHaveProperty("invoiceId");
    expect(data).toHaveProperty("paymentOptions");
  });

  it("should return 404 for non-existent toy", async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [],
      rowCount: 0,
    });

    const response = await fetch("http://localhost:3000/api/game/toys/999/invoice");
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty("error");
  });

  it("should return 400 if toy is sold out", async () => {
    const mockToy = {
      id: 1,
      name: "Robot",
      base_price_usdt0: "100000",
      max_mint_per_type: 10,
    };

    (query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [mockToy],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ count: "10" }],
        rowCount: 1,
      });

    const response = await fetch("http://localhost:3000/api/game/toys/1/invoice");
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("maximum mints");
  });
});

describe("POST /api/game/toys/purchase", () => {
  it("should successfully purchase toy after payment verification", async () => {
    const mockToy = {
      id: 1,
      name: "Robot",
      base_price_usdt0: "100000",
      max_mint_per_type: 10,
      stat_categories: ["Speed", "Power"],
      rarity_distribution: { common: 60, rare: 25, epic: 10, legendary: 5 },
    };

    // Mock payment verification
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "confirmed" }),
    });

    (query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [mockToy],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ count: "5" }],
        rowCount: 1,
      });

    const { transaction } = require("../../../src/lib/api/db");
    (transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      };
      return callback(mockClient);
    });

    const purchaseData = {
      toy_type_id: 1,
      payment: {
        chosenOption: {
          from: "0x1234567890123456789012345678901234567890",
          amount: "100000",
        },
      },
    };

    const response = await fetch("http://localhost:3000/api/game/toys/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purchaseData),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data).toHaveProperty("token_id");
    expect(data).toHaveProperty("rarity");
    expect(data).toHaveProperty("stats");
  });

  it("should reject purchase if payment not confirmed", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "failed" }),
    });

    const purchaseData = {
      toy_type_id: 1,
      payment: {
        chosenOption: {
          from: "0x1234567890123456789012345678901234567890",
          amount: "100000",
        },
      },
    };

    const response = await fetch("http://localhost:3000/api/game/toys/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purchaseData),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("not confirmed");
  });

  it("should reject purchase if toy sold out", async () => {
    const mockToy = {
      id: 1,
      name: "Robot",
      base_price_usdt0: "100000",
      max_mint_per_type: 10,
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "confirmed" }),
    });

    (query as jest.Mock)
      .mockResolvedValueOnce({
        rows: [mockToy],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [{ count: "10" }],
        rowCount: 1,
      });

    const purchaseData = {
      toy_type_id: 1,
      payment: {
        chosenOption: {
          from: "0x1234567890123456789012345678901234567890",
          amount: "100000",
        },
      },
    };

    const response = await fetch("http://localhost:3000/api/game/toys/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(purchaseData),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

