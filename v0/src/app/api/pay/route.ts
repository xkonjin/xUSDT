import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const merchantUrl: string = body.merchantUrl || "http://127.0.0.1:8000";
    const payload = body.payload;
    if (!payload) return NextResponse.json({ error: "missing payload" }, { status: 400 });
    const res = await fetch(`${merchantUrl.replace(/\/$/, "")}/pay`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    // Read body once, then attempt to JSON-parse
    const raw = await res.text();
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw || null;
    }
    return NextResponse.json(data ?? { error: "empty upstream response" }, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}


