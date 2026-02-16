import { NextResponse, type NextRequest } from "next/server";

const HOUDINI_BASE = "https://api-partner.houdiniswap.com";
const API_KEY = process.env.HOUDINI_API_KEY || "";
const API_SECRET = process.env.HOUDINI_API_SECRET || "";

function getHeaders(req: NextRequest): Record<string, string> {
  return {
    Authorization: `${API_KEY}:${API_SECRET}`,
    "Content-Type": "application/json",
    "x-user-ip": req.headers.get("x-forwarded-for")?.split(",")[0] || "0.0.0.0",
    "x-user-agent": req.headers.get("user-agent") || "",
    "x-user-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * GET /api/houdini?action=quote&amount=100&from=USDT&to=USDT&anonymous=true
 * GET /api/houdini?action=status&id=HOUDINI_ID
 */
export async function GET(req: NextRequest) {
  if (!API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Houdini Swap not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "quote") {
    const amount = searchParams.get("amount");
    const from = searchParams.get("from") || "USDT";
    const to = searchParams.get("to") || "USDT";
    const anonymous = searchParams.get("anonymous") || "true";

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const params = new URLSearchParams({ amount, from, to, anonymous });
    const res = await fetch(`${HOUDINI_BASE}/quote?${params}`, {
      headers: getHeaders(req),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Houdini quote failed: ${text}` },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  }

  if (action === "status") {
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const res = await fetch(
      `${HOUDINI_BASE}/status?id=${encodeURIComponent(id)}`,
      {
        headers: getHeaders(req),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Houdini status failed: ${text}` },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/**
 * POST /api/houdini
 * Body: { amount, from, to, addressTo, anonymous }
 */
export async function POST(req: NextRequest) {
  if (!API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: "Houdini Swap not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { amount, from, to, addressTo, anonymous = true } = body;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!addressTo || typeof addressTo !== "string" || addressTo.length < 10) {
    return NextResponse.json({ error: "Invalid addressTo" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "0.0.0.0";
  const userAgent = req.headers.get("user-agent") || "";

  const exchangeBody = {
    amount: parseFloat(amount),
    from: from || "USDT",
    to: to || "USDT",
    addressTo,
    receiverTag: "",
    anonymous,
    ip,
    userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  const res = await fetch(`${HOUDINI_BASE}/exchange`, {
    method: "POST",
    headers: getHeaders(req),
    body: JSON.stringify(exchangeBody),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Houdini exchange failed: ${text}` },
      { status: res.status }
    );
  }

  return NextResponse.json(await res.json());
}
