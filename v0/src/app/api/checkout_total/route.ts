import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress, parseAbi } from "viem";

const routerAbi = parseAbi([
  "function nonces(address) view returns (uint256)",
]);

function toAtomic(amountDecimal: string): bigint {
  // Convert decimal string to 6dp atomic units (USD₮ style)
  const [i, f = ""] = amountDecimal.split(".");
  const frac = (f + "000000").slice(0, 6);
  const s = `${i}${frac}`.replace(/^0+(?=\d)/, "");
  return BigInt(s.length ? s : "0");
}

export async function POST(req: NextRequest) {
  try {
    const { amountDecimal, amountAtomic, buyer } = await req.json();
    if (!buyer) return NextResponse.json({ error: "missing buyer" }, { status: 400 });

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const chainId = Number(process.env.PLASMA_CHAIN_ID || 9745);
    const router = process.env.ROUTER_ADDRESS as `0x${string}`;
    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const merchant = process.env.MERCHANT_ADDRESS as `0x${string}`;
    if (!router || !token || !merchant) {
      return NextResponse.json({ error: "server missing ROUTER_ADDRESS/USDT0_ADDRESS/MERCHANT_ADDRESS" }, { status: 500 });
    }

    const buyerAddr = getAddress(buyer);
    const atomic: bigint = amountAtomic != null
      ? BigInt(amountAtomic)
      : toAtomic(String(amountDecimal ?? "0"));
    if (atomic <= 0n) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });

    const client = createPublicClient({ transport: http(rpc) });
    const nonceBn = await client.readContract({ address: router, abi: routerAbi, functionName: "nonces", args: [buyerAddr] }) as bigint;

    const now = Math.floor(Date.now() / 1000);
    const deadline = BigInt(now + 10 * 60);

    const domain = {
      name: "PaymentRouter",
      version: "1",
      chainId,
      verifyingContract: router,
    } as const;

    const types = {
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
      from: buyerAddr,
      to: getAddress(merchant),
      amount: atomic,
      nonce: nonceBn,
      deadline,
    } as const;

    return NextResponse.json({
      domain,
      types,
      message,
      amount: atomic.toString(),
      deadline: deadline.toString(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


