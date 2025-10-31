import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    router: process.env.ROUTER_ADDRESS || null,
    token: process.env.USDT0_ADDRESS || null,
    nft: process.env.NFT_CONTRACT || null,
    rpc: process.env.PLASMA_RPC || null,
  });
}
