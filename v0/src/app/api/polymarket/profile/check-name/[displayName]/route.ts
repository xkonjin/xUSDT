import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

/**
 * Check if display name is available
 * 
 * Returns availability status and validation errors if any.
 */
export async function GET(
  request: Request,
  { params }: { params: { displayName: string } }
) {
  try {
    const { displayName } = params;
    const response = await fetch(`${BACKEND_URL}/polymarket/profile/check-name/${encodeURIComponent(displayName)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || "Failed to check name" }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking name:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to check name" }, { status: 500 });
  }
}

