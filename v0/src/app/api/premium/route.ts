import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantUrl = searchParams.get("merchantUrl") || "http://127.0.0.1:8000";
  const sku = searchParams.get("sku");
  const path = sku ? `/product/${encodeURIComponent(sku)}` : "/premium";
  const url = `${merchantUrl.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      const txt = await res.text();
      body = txt || null;
    }
    return NextResponse.json(body ?? { error: "empty upstream response" }, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}


