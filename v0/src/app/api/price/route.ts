import { NextRequest, NextResponse } from "next/server";
import { callRpc } from "@/app/lib/rpc";

function encodeUint64(value: number) {
  const hex = BigInt(value).toString(16);
  return hex.padStart(64, "0");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const toyId = Number(searchParams.get("toyId"));
  const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
  const nft = process.env.NFT_CONTRACT;
  if (!nft || !toyId) return NextResponse.json({ error: "missing params" }, { status: 400 });
  // selector for currentPrice(uint64): 0x7a9e5f94 (computed offline)
  const selector = "0x7a9e5f94";
  const data = selector + encodeUint64(toyId);
  try {
    const result: string = await callRpc(rpc, "eth_call", [{ to: nft, data }, "latest"]);
    const price = Number(BigInt(result)) / 1_000_000; // USDT0 has 6 decimals
    return NextResponse.json({ toyId, price });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
