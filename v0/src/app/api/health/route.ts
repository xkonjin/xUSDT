import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedUrl = searchParams.get("merchantUrl") || "http://127.0.0.1:8000";

  // Allowlist of permitted merchant base URLs
  const allowedMerchants = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    process.env.MERCHANT_URL,
  ].filter(Boolean) as string[];

  // Validate requestedUrl against allowlist
  if (!allowedMerchants.includes(requestedUrl)) {
    return NextResponse.json({ error: "Invalid merchant URL" }, { status: 400 });
  }

  const base = requestedUrl.replace(/\/$/, "");
  const url = `${base}/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      const txt = await res.text();
      body = txt || null;
    }
    return NextResponse.json(body ?? { error: "empty upstream response" }, { status: res.status });
  } catch (e) {
    console.error("Health check failed:", e);
    return NextResponse.json(
      { error: "Failed to reach upstream service" },
      { status: 502 }
    );
  }
}


