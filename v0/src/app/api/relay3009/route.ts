import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseAbi, defineChain, getAddress, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const tokenAbi = parseAbi([
  "function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,uint8 v,bytes32 r,bytes32 s)",
]);
const nftAbi = parseAbi([
  "function mintTo(address to,uint64 toyId,uint256 quotedPrice,uint256 deadline,bytes memoSig)",
]);

export async function POST(req: NextRequest) {
  try {
    const { toyId, buyer, amount, validAfter, validBefore, nonce, signature } = await req.json();
    if (!toyId || !buyer || !amount || !validAfter || !validBefore || !nonce || !signature) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const chainId = Number(process.env.PLASMA_CHAIN_ID || 9745);
    const plasma = defineChain({ id: chainId, name: "Plasma", nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });

    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const nft = process.env.NFT_CONTRACT as `0x${string}`;
    const pk = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;
    if (!token || !nft || !pk) return NextResponse.json({ error: "server missing env vars" }, { status: 500 });

    const account = privateKeyToAccount(pk);
    const pub = createPublicClient({ chain: plasma, transport: http(rpc) });
    const wallet = createWalletClient({ account, chain: plasma, transport: http(rpc) });

    // parse signature
    const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
    const r = ("0x" + hex.slice(0, 64)) as `0x${string}`;
    const s = ("0x" + hex.slice(64, 128)) as `0x${string}`;
    let v = parseInt(hex.slice(128, 130), 16);
    if (v < 27) v += 27;

    // Execute token transferWithAuthorization (no allowance needed)
    const gasPrice = await pub.getGasPrice();
    const data = encodeFunctionData({
      abi: tokenAbi,
      functionName: "transferWithAuthorization",
      args: [getAddress(buyer), getAddress(process.env.MERCHANT_ADDRESS as string), BigInt(amount), BigInt(validAfter), BigInt(validBefore), nonce as `0x${string}`, v, r, s],
    });
    const tx = await wallet.sendTransaction({ to: token, data, gasPrice, type: "legacy" });
    // Return quickly; UI can poll if needed
    let status: string | number = "submitted";
    try {
      const rcpt = await pub.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
      status = rcpt.status as any;
    } catch {}

    // Mint NFT upon success
    const now = Math.floor(Date.now() / 1000);
    const deadline = BigInt(now + 10 * 60);
    const mintData = encodeFunctionData({ abi: nftAbi, functionName: "mintTo", args: [getAddress(buyer), BigInt(toyId), BigInt(amount), deadline, "0x"] });
    const mintTx = await wallet.sendTransaction({ to: nft, data: mintData, gasPrice, type: "legacy" });
    let mintStatus: string | number = "submitted";
    try {
      const mrcpt = await pub.waitForTransactionReceipt({ hash: mintTx, confirmations: 1 });
      mintStatus = mrcpt.status as any;
    } catch {}

    return NextResponse.json({ transferTx: tx, mintTx, status, mintStatus });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
