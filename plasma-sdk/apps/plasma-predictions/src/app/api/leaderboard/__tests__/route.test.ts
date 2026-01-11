/**
 * @jest-environment node
 */
import { GET } from "../route";
import { NextRequest } from "next/server";

// Mock users for testing
const mockUsers = [
  {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    totalProfit: 1000,
    totalVolume: 5000,
    winCount: 10,
    lossCount: 5,
    winRate: 0.67,
    lastUpdated: new Date().toISOString(),
  },
  {
    address: "0xabcdef1234567890abcdef1234567890abcdef12",
    totalProfit: 500,
    totalVolume: 3000,
    winCount: 5,
    lossCount: 2,
    winRate: 0.71,
    lastUpdated: new Date().toISOString(),
  },
];

// Mock the leaderboard store module
jest.mock("@/lib/leaderboard-store", () => ({
  getLeaderboardData: jest.fn(() => mockUsers),
}));

function createRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params);
  return new NextRequest(
    `http://localhost:3000/api/leaderboard?${searchParams.toString()}`
  );
}

describe("GET /api/leaderboard", () => {
  it("should return leaderboard data", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.leaderboard).toBeDefined();
    expect(Array.isArray(data.leaderboard)).toBe(true);
  });

  it("should support sortBy parameter", async () => {
    const request = createRequest({ sortBy: "volume" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sortBy).toBe("volume");
  });

  it("should support period/timeFilter parameter", async () => {
    const request = createRequest({ period: "week" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.period).toBe("week");
  });

  it("should support limit parameter", async () => {
    const request = createRequest({ limit: "5" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(5);
  });

  it("should include rank in each user entry", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    if (data.leaderboard.length > 0) {
      expect(data.leaderboard[0].rank).toBe(1);
    }
  });

  it("should include total count in response", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(typeof data.total).toBe("number");
  });

  it("should have CORS headers", async () => {
    const request = createRequest();
    const response = await GET(request);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("should default to profit sortBy", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.sortBy).toBe("profit");
  });

  it("should default to all period", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.period).toBe("all");
  });

  it("should default limit to 100", async () => {
    const request = createRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.limit).toBe(100);
  });
});
