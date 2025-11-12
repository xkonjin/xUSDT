import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

/**
 * Handle USDT0 deposit via x402 payment
 * 
 * Accepts x402 PaymentSubmitted, settles payment, and queues conversion.
 * Returns deposit confirmation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/polymarket/deposit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.detail || "Failed to process deposit" }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing deposit:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to process deposit" }, { status: 500 });
  }
}

