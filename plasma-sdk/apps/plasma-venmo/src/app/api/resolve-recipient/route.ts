import { NextResponse } from "next/server";
import type { Address } from "viem";

// Lazy-load Privy client to avoid build-time initialization errors
let privyClient: import("@privy-io/server-auth").PrivyClient | null = null;

function getPrivyClient() {
  if (!privyClient) {
    const privyAppId = process.env.PRIVY_APP_ID || "";
    const privyAppSecret = process.env.PRIVY_APP_SECRET || "";
    if (!privyAppId || !privyAppSecret) {
      return null;
    }
    // Dynamic import to avoid build-time initialization
    const { PrivyClient } = require("@privy-io/server-auth");
    privyClient = new PrivyClient(privyAppId, privyAppSecret);
  }
  return privyClient;
}

const userCache = new Map<string, Address>();

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "Missing identifier" },
        { status: 400 }
      );
    }

    const cached = userCache.get(identifier.toLowerCase());
    if (cached) {
      return NextResponse.json({ address: cached });
    }

    const isEmail = identifier.includes("@");
    const isPhone = /^\+?\d{10,}$/.test(identifier.replace(/[\s-]/g, ""));

    if (!isEmail && !isPhone) {
      if (identifier.startsWith("0x") && identifier.length === 42) {
        return NextResponse.json({ address: identifier });
      }
      return NextResponse.json(
        { error: "Invalid identifier. Use email, phone, or wallet address." },
        { status: 400 }
      );
    }

    const privy = getPrivyClient();
    if (!privy) {
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 503 }
      );
    }

    let user = null;
    if (isEmail) {
      user = await privy.getUserByEmail(identifier).catch(() => null);
    } else if (isPhone) {
      user = await privy.getUserByEmail(identifier).catch(() => null);
    }

    if (!user) {
      return NextResponse.json(
        { error: "Recipient not found. They need to sign up first." },
        { status: 404 }
      );
    }

    const embeddedWallet = user.linkedAccounts.find(
      (account: { type: string; walletClientType?: string }) =>
        account.type === "wallet" && account.walletClientType === "privy"
    );

    if (!embeddedWallet || !("address" in embeddedWallet)) {
      return NextResponse.json(
        { error: "Recipient has no wallet. They need to complete signup." },
        { status: 404 }
      );
    }

    const address = embeddedWallet.address as Address;
    userCache.set(identifier.toLowerCase(), address);

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Resolve recipient error:", error);
    return NextResponse.json(
      { error: "Failed to resolve recipient" },
      { status: 500 }
    );
  }
}
