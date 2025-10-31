import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";

const abi = parseAbi([
  "function currentPrice(uint64 toyId) view returns (uint256)",
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const toyId = Number(searchParams.get("toyId"));
    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    if (!nft || !toyId) return NextResponse.json({ error: "missing params" }, { status: 400 });

    const client = createPublicClient({ transport: http(rpc) });
    const price = await client.readContract({ address: nft, abi, functionName: "currentPrice", args: [BigInt(toyId)] }) as bigint;
    return NextResponse.json({ toyId, price: Number(price) / 1_000_000 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
