import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";

const abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
  "function tokenToyId(uint256) view returns (uint64)",
  "function tokenVersion(uint256) view returns (uint256)",
  "function priceAtMint(uint256) view returns (uint256)",
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    if (!owner) return NextResponse.json({ error: "missing owner" }, { status: 400 });

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    if (!nft) return NextResponse.json({ error: "missing NFT_CONTRACT" }, { status: 500 });

    const client = createPublicClient({ transport: http(rpc) });
    const balance = (await client.readContract({ address: nft, abi, functionName: "balanceOf", args: [owner as `0x${string}`] })) as bigint;
    const tokens: Array<{ tokenId: string; toyId: number; version: number; price: number } > = [];
    for (let i = 0n; i < balance; i++) {
      const tokenId = (await client.readContract({ address: nft, abi, functionName: "tokenOfOwnerByIndex", args: [owner as `0x${string}`, i] })) as bigint;
      const toyId = (await client.readContract({ address: nft, abi, functionName: "tokenToyId", args: [tokenId] })) as bigint;
      const version = (await client.readContract({ address: nft, abi, functionName: "tokenVersion", args: [tokenId] })) as bigint;
      const price = (await client.readContract({ address: nft, abi, functionName: "priceAtMint", args: [tokenId] })) as bigint;
      tokens.push({ tokenId: tokenId.toString(), toyId: Number(toyId), version: Number(version), price: Number(price) / 1_000_000 });
    }
    return NextResponse.json({ owner, tokens });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
