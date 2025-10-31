import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseAbi, defineChain, getAddress, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const tokenAbi = parseAbi([
  "function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,uint8 v,bytes32 r,bytes32 s)",
]);
const nftAbi = parseAbi([
  "function currentPrice(uint64 toyId) view returns (uint256)",
  "function mintTo(address to,uint64 toyId,uint256 quotedPrice,uint256 deadline,bytes memoSig)",
]);

export async function POST(req: NextRequest) {
  try {
    const { buyer, amount, validAfter, validBefore, nonce, signature, items } = await req.json();
    if (!buyer || !amount || !validAfter || !validBefore || !nonce || !signature || !Array.isArray(items)) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const chainId = Number(process.env.PLASMA_CHAIN_ID || 9745);
    const plasma = defineChain({ id: chainId, name: "Plasma", nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });

    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    const merchant = process.env.MERCHANT_ADDRESS as `0x${string}`;
    const pk = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;
    if (!token || !nft || !merchant || !pk) return NextResponse.json({ error: "server missing env vars" }, { status: 500 });

    const account = privateKeyToAccount(pk);
    const pub = createPublicClient({ chain: plasma, transport: http(rpc) });
    const wallet = createWalletClient({ account, chain: plasma, transport: http(rpc) });

    // parse signature
    const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
    const r = ("0x" + hex.slice(0, 64)) as `0x${string}`;
    const s = ("0x" + hex.slice(64, 128)) as `0x${string}`;
    let v = parseInt(hex.slice(128, 130), 16);
    if (v < 27) v += 27;

    // 1) Transfer total to merchant via 3009
    const gasPrice = await pub.getGasPrice();
    const transferData = encodeFunctionData({ abi: tokenAbi, functionName: "transferWithAuthorization", args: [getAddress(buyer), merchant, BigInt(amount), BigInt(validAfter), BigInt(validBefore), nonce as `0x${string}`, v, r, s] });
    const transferTx = await wallet.sendTransaction({ to: token, data: transferData, gasPrice, type: "legacy" });
    let transferStatus: string | number = "submitted";
    try {
      const rcpt = await pub.waitForTransactionReceipt({ hash: transferTx, confirmations: 1 });
      transferStatus = rcpt.status as any;
    } catch {}

    // 2) Mint sequentially up to total amount
    let spent = 0n;
    const mints: Array<{ toyId: number; price: string; tx: `0x${string}` }> = [];

    for (const it of items as Array<{ toyId: number; qty: number }>) {
      const toyId = Number(it.toyId);
      const qty = Number(it.qty || 0);
      for (let i = 0; i < qty; i++) {
        const price = (await pub.readContract({ address: nft, abi: nftAbi, functionName: "currentPrice", args: [BigInt(toyId)] })) as bigint;
        if (spent + price > BigInt(amount)) break;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 10 * 60);
        const mintData = encodeFunctionData({ abi: nftAbi, functionName: "mintTo", args: [getAddress(buyer), BigInt(toyId), price, deadline, "0x"] });
        const mintTx = await wallet.sendTransaction({ to: nft, data: mintData, gasPrice, type: "legacy" });
        // Do not block; attempt best-effort poll
        try { await pub.waitForTransactionReceipt({ hash: mintTx, confirmations: 1 }); } catch {}
        spent += price;
        mints.push({ toyId, price: price.toString(), tx: mintTx });
      }
    }

    return NextResponse.json({ transferTx, status: transferStatus, spent: spent.toString(), mints });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
