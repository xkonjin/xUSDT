import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantUrl = searchParams.get("merchantUrl") || "http://127.0.0.1:8000";
  const sku = searchParams.get("sku");
  const invoiceId = searchParams.get("invoiceId");
  const base = new URL(`${merchantUrl.replace(/\/$/, "")}${sku ? `/product/${encodeURIComponent(sku)}` : "/premium"}`);
  if (invoiceId) base.searchParams.set("invoiceId", invoiceId);
  const url = base.toString();
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const raw = await res.text();
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw || null;
    }
    return NextResponse.json(body ?? { error: "empty upstream response" }, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}


