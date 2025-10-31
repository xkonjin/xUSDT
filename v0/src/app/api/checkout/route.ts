import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress, parseAbi } from "viem";

const abi = parseAbi([
  "function nonces(address) view returns (uint256)",
  "function currentPrice(uint64 toyId) view returns (uint256)",
]);

export async function POST(req: NextRequest) {
  try {
    const { toyId, buyer } = await req.json();
    if (!toyId || !buyer) return NextResponse.json({ error: "missing params" }, { status: 400 });

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const chainId = Number(process.env.PLASMA_CHAIN_ID || 9745);
    const router = process.env.ROUTER_ADDRESS as `0x${string}`;
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const merchant = process.env.MERCHANT_ADDRESS as `0x${string}`;
    if (!router || !nft || !token || !merchant) {
      return NextResponse.json({ error: "server missing ROUTER_ADDRESS/NFT_CONTRACT/USDT0_ADDRESS/MERCHANT_ADDRESS" }, { status: 500 });
    }

    const client = createPublicClient({ transport: http(rpc) });

    const [nonceBn, priceBn] = await Promise.all([
      client.readContract({ address: router, abi, functionName: "nonces", args: [getAddress(buyer)] }) as Promise<bigint>,
      client.readContract({ address: nft, abi, functionName: "currentPrice", args: [BigInt(toyId)] }) as Promise<bigint>,
    ]);

    const now = Math.floor(Date.now() / 1000);
    const deadlineBn = BigInt(now + 10 * 60);
    const amountBn = priceBn; // 6dp USDT0

    const domain = {
      name: "PaymentRouter",
      version: "1",
      chainId,
      verifyingContract: router,
    };

    const types = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Transfer: [
        { name: "token", type: "address" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    } as const;

    const message = {
      token,
      from: getAddress(buyer),
      to: merchant,
      amount: amountBn.toString(),
      nonce: nonceBn.toString(),
      deadline: deadlineBn.toString(),
    } as const;

    return NextResponse.json({
      toyId,
      buyer: getAddress(buyer),
      router,
      token,
      merchant,
      amount: amountBn.toString(),
      nonce: nonceBn.toString(),
      deadline: deadlineBn.toString(),
      typedData: { domain, types, primaryType: "Transfer", message },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
