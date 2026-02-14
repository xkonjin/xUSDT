import { NextResponse } from "next/server";

/**
 * POST /api/stripe-onramp
 *
 * Creates a Stripe Crypto Onramp session.
 * Returns a client_secret for the frontend OnrampElement.
 *
 * Required env vars:
 * - STRIPE_SECRET_KEY
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 */
export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  try {
    const { walletAddress, amount, currency = "usd" } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Create onramp session via Stripe API
    const params = new URLSearchParams();
    params.set("wallet_addresses[ethereum]", walletAddress);
    params.set("source_currency", currency);
    if (amount) {
      params.set("source_amount", amount);
    }
    // USDC is the closest stablecoin Stripe supports
    params.set("destination_currencies[]", "usdc");
    // Base has lowest fees for USDC
    params.set("destination_networks[]", "base");
    params.set("destination_networks[]", "ethereum");

    const response = await fetch(
      "https://api.stripe.com/v1/crypto/onramp_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("[stripe-onramp] Session creation failed:", error);
      return NextResponse.json(
        { error: "Failed to create onramp session" },
        { status: response.status }
      );
    }

    const session = await response.json();

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("[stripe-onramp] Error:", error);
    return NextResponse.json(
      { error: "Failed to create onramp session" },
      { status: 500 }
    );
  }
}
