import { NextResponse } from "next/server";
import type { Address } from "viem";

// Lazy-load Privy client to avoid build-time initialization errors
let privyClient: import("@privy-io/server-auth").PrivyClient | null = null;

function getPrivyClient() {
  if (isMockMode()) return null;
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
const MOCK_RECIPIENT_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_RECIPIENT_ADDRESS ||
  "0xa7C542386ddA8A4edD9392AB487ede0507bDD281") as Address;

const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

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

    if (isMockMode()) {
      return NextResponse.json({
        address: MOCK_RECIPIENT_ADDRESS,
        mock: true,
      });
    }

    const privy = getPrivyClient();
    if (!privy) {
      if (isMockMode()) {
        return NextResponse.json({
          address: MOCK_RECIPIENT_ADDRESS,
          mock: true,
        });
      }
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 503 }
      );
    }

    interface PrivyUser {
      linkedAccounts: Array<{
        type: string;
        walletClientType?: string;
        address?: string;
      }>;
    }

    let user: PrivyUser | null = null;
    if (isEmail) {
      user = (await privy
        .getUserByEmail(identifier)
        .catch(() => null)) as PrivyUser | null;
    } else if (isPhone) {
      const normalizedPhone = identifier.replace(/[\s-]/g, "");
      const privyAny = privy as unknown as {
        getUserByPhone?: (phone: string) => Promise<PrivyUser | null>;
      };
      if (privyAny.getUserByPhone) {
        user = await privyAny.getUserByPhone(normalizedPhone).catch(() => null);
      }
    }

    if (!user) {
      // User not found - return needsClaim flag instead of error
      // The sender can create a claim link that the recipient can claim after signing up
      return NextResponse.json({ 
        needsClaim: true,
        identifier: identifier,
        message: "Recipient not registered yet. A claim link will be created."
      });
    }

    const embeddedWallet = user.linkedAccounts.find(
      (account) =>
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
