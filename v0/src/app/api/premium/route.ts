import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantUrl =
    searchParams.get("merchantUrl") ||
    process.env.MERCHANT_URL ||
    process.env.NEXT_PUBLIC_MERCHANT_URL ||
    ""; // empty → upstream 502 with clear error below
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
    const hint = merchantUrl ? `merchantUrl=${merchantUrl}` : "merchantUrl not configured";
    return NextResponse.json({ error: String(e), hint }, { status: 502 });
  }
}


