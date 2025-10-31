import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbi } from "viem";

const abi = parseAbi([
  "function getLeader(uint64 toyId) view returns (address owner_, uint256 price_, uint256 tokenId_)",
]);

const TOY_IDS = [1,2,3,4,5,6];

export async function GET() {
  try {
    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    if (!nft) return NextResponse.json({ toys: [] });

    const client = createPublicClient({ transport: http(rpc) });
    const results: Array<{ toyId: number; owner: string; price: number; tokenId: string }> = [];
    for (const id of TOY_IDS) {
      try {
        const [owner, price, tokenId] = await client.readContract({ address: nft, abi, functionName: "getLeader", args: [BigInt(id)] }) as unknown as [string, bigint, bigint];
        if (owner && owner !== "0x0000000000000000000000000000000000000000") {
          results.push({ toyId: id, owner, price: Number(price)/1_000_000, tokenId: tokenId.toString() });
        }
      } catch {}
    }
    return NextResponse.json({ leaders: results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
