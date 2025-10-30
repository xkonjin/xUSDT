import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes } from "crypto";

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
    // Fallback mock to enable local UI testing without a merchant backend running.
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 600;
    const invoiceId = randomUUID();
    const nonce32 = "0x" + randomBytes(32).toString("hex");
    const amount = 100000; // 0.1 USDT0 for demo
    const mock = {
      invoiceId,
      timestamp: now,
      paymentOptions: [
        {
          network: "plasma",
          chainId: 9745,
          token: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
          recipient: "0x000000000000000000000000000000000000dEaD",
          amount: String(amount),
          decimals: 6,
          scheme: "eip3009-transfer-with-auth",
          nonce: nonce32,
          deadline,
        },
      ],
      description: sku ? `Order ${sku}` : "Premium API access (mock)",
    };
    return NextResponse.json(mock, { status: 402 });
  }
}


