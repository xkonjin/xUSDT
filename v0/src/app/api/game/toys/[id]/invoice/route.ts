/**
 * Toy Invoice API Route
 * 
 * Gets payment invoice for a specific toy.
 * Proxies to merchant service for payment processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/api/db";

const MERCHANT_URL = process.env.MERCHANT_URL || "http://127.0.0.1:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const toyId = parseInt(id);
    
    // Get toy info from database
    interface ToyRow {
      id: number;
      name: string;
      description: string;
      base_price_usdt0: string;
      max_mint_per_type: number;
    }

    const toyResult = await query<ToyRow>(
      `SELECT id, name, description, base_price_usdt0, max_mint_per_type 
       FROM toys WHERE id = $1`,
      [toyId]
    );

    if (toyResult.rows.length === 0) {
      return NextResponse.json(
        { error: `Toy type ${toyId} not found` },
        { status: 404 }
      );
    }

    const toy = toyResult.rows[0]!;
    
    // Check mint count
    const mintResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM nft_toys WHERE toy_type_id = $1`,
      [toyId]
    );
    
    const mintCount = parseInt(mintResult.rows[0]?.count || "0");
    
    if (mintCount >= toy.max_mint_per_type) {
      return NextResponse.json(
        { error: `Toy type ${toy.name} has reached maximum mints (${toy.max_mint_per_type})` },
        { status: 400 }
      );
    }

    // Get payment invoice from merchant service
    // For now, proxy to merchant service which handles payment logic
    const amountAtomic = Number(toy.base_price_usdt0);
    
    // Call merchant service to get payment invoice
    // In a full implementation, we'd build the PaymentRequired here
    // For now, proxy to merchant service
    const merchantResponse = await fetch(`${MERCHANT_URL}/product/toy-${toyId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (merchantResponse.status === 402) {
      const invoice = await merchantResponse.json();
      return NextResponse.json(invoice, { status: 402 });
    }

    // Fallback: create basic invoice structure
    const invoiceId = `toy-${toyId}-${Date.now()}`;
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 600; // 10 minutes

    const invoice = {
      type: "payment-required",
      invoiceId,
      timestamp: now,
      description: `Purchase ${toy.name} toy`,
      paymentOptions: [
        {
          network: "plasma",
          chainId: parseInt(process.env.PLASMA_CHAIN_ID || "9745"),
          token: process.env.USDT0_ADDRESS || "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
          tokenSymbol: "USDT0",
          amount: String(amountAtomic),
          decimals: 6,
          recipient: process.env.MERCHANT_ADDRESS || "",
          scheme: "eip3009-transfer-with-auth",
          nonce: Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("")
            .padEnd(64, "0"),
          deadline,
          recommendedMode: "channel",
        },
      ],
    };

    return NextResponse.json(invoice, { status: 402 });
  } catch (error) {
    console.error("Error getting toy invoice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get invoice" },
      { status: 500 }
    );
  }
}
