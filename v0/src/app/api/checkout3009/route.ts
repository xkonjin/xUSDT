import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbi, getAddress } from "viem";

const erc20NameAbi = parseAbi([
  "function name() view returns (string)",
  "function version() view returns (string)",
]);
const priceAbi = parseAbi([
  "function currentPrice(uint64 toyId) view returns (uint256)",
]);

export async function POST(req: NextRequest) {
  try {
    const { toyId, buyer } = await req.json();
    if (!toyId || !buyer) return NextResponse.json({ error: "missing params" }, { status: 400 });

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const chainId = Number(process.env.PLASMA_CHAIN_ID || 9745);
    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    const merchant = process.env.MERCHANT_ADDRESS as `0x${string}`;
    if (!token || !nft || !merchant) return NextResponse.json({ error: "server missing env vars" }, { status: 500 });

    const client = createPublicClient({ transport: http(rpc) });

    // Read token metadata (best-effort)
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

    // Quote price from NFT contract
    const priceBn = await client.readContract({ address: nft, abi: priceAbi, functionName: "currentPrice", args: [BigInt(toyId)] }) as bigint;

    const now = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(now - 60);
    const validBefore = BigInt(now + 10 * 60);
    const amountBn = priceBn; // 6dp USDT0

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
      value: amountBn.toString(),
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
    } as const;

    return NextResponse.json({
      toyId,
      token,
      nft,
      merchant,
      amount: amountBn.toString(),
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
      typedData: { domain, types, primaryType: "TransferWithAuthorization", message },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
