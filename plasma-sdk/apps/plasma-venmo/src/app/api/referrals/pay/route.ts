import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PLASMA_RPC = process.env.PLASMA_RPC || "https://rpc.plasma.to";
const USDT0_ADDRESS = process.env.USDT0_ADDRESS || "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

// POST /api/referrals/pay - Pay out pending referral rewards
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refereeAddress } = body;

    if (!refereeAddress) {
      return NextResponse.json({ error: "Missing refereeAddress" }, { status: 400 });
    }

    // Find pending referral for this referee
    const referral = await prisma.referral.findFirst({
      where: {
        refereeAddress: refereeAddress.toLowerCase(),
        rewardStatus: "pending",
      },
    });

    if (!referral) {
      return NextResponse.json({ error: "No pending referral found" }, { status: 404 });
    }

    if (!RELAYER_PRIVATE_KEY) {
      console.error("RELAYER_PRIVATE_KEY not configured");
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    // Pay the referrer
    const account = privateKeyToAccount(RELAYER_PRIVATE_KEY as `0x${string}`);
    const client = createWalletClient({
      account,
      chain: {
        id: 9745,
        name: "Plasma",
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [PLASMA_RPC] } },
      },
      transport: http(PLASMA_RPC),
    });

    const amount = parseUnits(referral.rewardAmount.toString(), 6);

    // Transfer USDT0 to referrer
    const hash = await client.writeContract({
      address: USDT0_ADDRESS as `0x${string}`,
      abi: [
        {
          name: "transfer",
          type: "function",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
        },
      ],
      functionName: "transfer",
      args: [referral.referrerAddress as `0x${string}`, amount],
    });

    // Update referral status
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        rewardStatus: "paid",
        rewardPaidAt: new Date(),
        rewardTxHash: hash,
      },
    });

    // Update referrer's total earned
    await prisma.userSettings.updateMany({
      where: { walletAddress: referral.referrerAddress },
      data: { totalEarned: { increment: referral.rewardAmount } },
    });

    return NextResponse.json({
      success: true,
      txHash: hash,
      amount: referral.rewardAmount,
      referrerAddress: referral.referrerAddress,
    });
  } catch (error) {
    console.error("Error paying referral reward:", error);
    return NextResponse.json(
      { error: "Failed to pay referral reward" },
      { status: 500 }
    );
  }
}
