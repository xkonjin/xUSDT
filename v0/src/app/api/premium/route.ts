import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantUrl = searchParams.get("merchantUrl") || "http://127.0.0.1:8000";
  const sku = searchParams.get("sku");
  const path = sku ? `/product/${encodeURIComponent(sku)}` : "/premium";
  const url = `${merchantUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}


