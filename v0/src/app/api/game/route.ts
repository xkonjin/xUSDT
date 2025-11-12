/**
 * Game API Routes
 * 
 * Proxies requests to the FastAPI game service.
 * Handles CORS and error handling for mobile compatibility.
 */

import { NextRequest, NextResponse } from "next/server";

const GAME_API_URL = process.env.GAME_API_URL || "http://127.0.0.1:8001";

/**
 * Proxy request to game API
 */
async function proxyRequest(
  request: NextRequest,
  path: string,
  options: RequestInit = {}
) {
  const url = new URL(path, GAME_API_URL);
  
  // Copy query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Game API request failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace("/api/game", "");
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace("/api/game", "");
  const body = await request.json();
  return proxyRequest(request, path, {
    method: "POST",
    body,
  });
}

