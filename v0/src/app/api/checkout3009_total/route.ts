import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, getAddress } from "viem";

const nftAbi = parseAbi([
  "function currentPrice(uint64 toyId) view returns (uint256)",
  "function mintedCount(uint64) view returns (uint256)",
  "function toys(uint64) view returns (uint64 toyId, uint128 minPrice, uint128 maxPrice, uint64 rMantissa, string baseURI)",
]);
const erc20NameAbi = parseAbi([
  "function name() view returns (string)",
  "function version() view returns (string)",
]);

function pow(base: bigint, exp: bigint): bigint {
  let result = 1n;
  let b = base;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result *= b;
    b *= b;
    e >>= 1n;
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { buyer, items } = await req.json();
    if (!buyer || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "missing buyer/items" }, { status: 400 });
    }

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const chainId = Number(process.env.PLASMA_CHAIN_ID || 9745);
    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    const merchant = process.env.MERCHANT_ADDRESS as `0x${string}`;
    if (!token || !nft || !merchant) return NextResponse.json({ error: "server missing env vars" }, { status: 500 });

    const client = createPublicClient({ transport: http(rpc) });

    // Token metadata for domain
    let name = "USDTe";
    let version = "1";
    try {
      const n = await client.readContract({ address: token, abi: erc20NameAbi, functionName: "name" });
      if (typeof n === "string" && n.length) name = n;
    } catch {}
    try {
      const v = await client.readContract({ address: token, abi: erc20NameAbi, functionName: "version" });
      if (typeof v === "string" && v.length) version = v;
    } catch {}

    const SCALE = 1_000_000n;

    // Compute total using curve params and current mintedCount
    let total = 0n;
    const breakdown: Array<{ toyId: number; qty: number; subtotal: string }> = [];

    for (const it of items as Array<{ toyId: number; qty: number }>) {
      const toyId = Number(it.toyId);
      const qty = Number(it.qty || 0);
      if (!toyId || qty <= 0) continue;

      const [toyStruct, minted] = await Promise.all([
        client.readContract({ address: nft, abi: nftAbi, functionName: "toys", args: [BigInt(toyId)] }) as Promise<[bigint, bigint, bigint, bigint, string]>,
        client.readContract({ address: nft, abi: nftAbi, functionName: "mintedCount", args: [BigInt(toyId)] }) as Promise<bigint>,
      ]);
      const minPrice = toyStruct[1];
      const maxPrice = toyStruct[2];
      const rMantissa = toyStruct[3];

      let subtotal = 0n;
      for (let i = 0; i < qty; i++) {
        const s = minted + BigInt(i);
        // price = min(minPrice * (rMantissa^s) / (SCALE^s), maxPrice)
        const num = pow(rMantissa, s);
        const den = pow(SCALE, s);
        let price = (minPrice * num) / den;
        if (price > maxPrice) price = maxPrice;
        if (price < minPrice) price = minPrice;
        subtotal += price;
      }
      total += subtotal;
      breakdown.push({ toyId, qty, subtotal: subtotal.toString() });
    }

    const now = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(now - 60);
    const validBefore = BigInt(now + 10 * 60);
    // random 32-byte nonce
    const nonce = "0x" + crypto.getRandomValues(new Uint8Array(32)).reduce((a, b) => a + b.toString(16).padStart(2, "0"), "");

    const domain = {
      name,
      version,
      chainId,
      verifyingContract: token,
    } as const;

    const types = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    } as const;

    const message = {
      from: getAddress(buyer),
      to: merchant,
      value: total.toString(),
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
    } as const;

    return NextResponse.json({
      total: total.toString(),
      breakdown,
      typedData: { domain, types, primaryType: "TransferWithAuthorization", message },
      params: { validAfter: validAfter.toString(), validBefore: validBefore.toString(), nonce, buyer: getAddress(buyer), merchant },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
