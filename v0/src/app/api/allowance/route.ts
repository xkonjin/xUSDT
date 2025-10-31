import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, getAddress } from "viem";

const erc20Abi = parseAbi([
  "function allowance(address owner,address spender) view returns (uint256)",
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    if (!owner) return NextResponse.json({ error: "missing owner" }, { status: 400 });
    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const router = process.env.ROUTER_ADDRESS as `0x${string}`;
    if (!token || !router) return NextResponse.json({ error: "server missing token/router" }, { status: 500 });

    const client = createPublicClient({ transport: http(rpc) });
    const a = await client.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [getAddress(owner), router] }) as bigint;
    return NextResponse.json({ owner: getAddress(owner), router, allowance: a.toString(), allowanceFloat: Number(a) / 1_000_000 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
