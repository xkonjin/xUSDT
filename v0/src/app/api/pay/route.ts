import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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
  const data = await res.json();
  return NextResponse.json(data, { status: 200 });
}


