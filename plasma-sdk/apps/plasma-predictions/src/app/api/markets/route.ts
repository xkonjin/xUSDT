import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";
    const page = searchParams.get("page") || "0";

    // Proxy to FastAPI backend
    const backendUrl = new URL(`${BACKEND_URL}/api/predictions/markets`);
    backendUrl.searchParams.set("category", category);
    backendUrl.searchParams.set("search", search);
    backendUrl.searchParams.set("page", page);

    const response = await fetch(backendUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
