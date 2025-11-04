import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, defineChain, http, parseAbi, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const routerAbi = parseAbi([
  "function gaslessTransfer(address token,address from,address to,uint256 amount,uint256 deadline,uint8 v,bytes32 r,bytes32 s)",
]);

export async function POST(req: NextRequest) {
  try {
    const { buyer, amount, deadline, signature } = await req.json();
    if (!buyer || !amount || !deadline || !signature) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    const rpc = process.env.PLASMA_RPC || "https://rpc.plasma.to";
    const chainId = Number(process.env.PLASMA_CHAIN_ID || 9745);
    const router = process.env.ROUTER_ADDRESS as `0x${string}`;
    const token = process.env.USDT0_ADDRESS as `0x${string}`;
    const merchant = process.env.MERCHANT_ADDRESS as `0x${string}`;
    const pk = process.env.RELAYER_PRIVATE_KEY as `0x${string}`;
    if (!router || !token || !merchant || !pk) {
      return NextResponse.json({ error: "server missing ROUTER_ADDRESS/USDT0_ADDRESS/MERCHANT_ADDRESS/RELAYER_PRIVATE_KEY" }, { status: 500 });
    }

    const plasma = defineChain({ id: chainId, name: "Plasma", nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
    const account = privateKeyToAccount(pk);
    const pub = createPublicClient({ chain: plasma, transport: http(rpc) });
    const wallet = createWalletClient({ account, chain: plasma, transport: http(rpc) });

    // split signature into v/r/s
    const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
    const r = ("0x" + hex.slice(0, 64)) as `0x${string}`;
    const s = ("0x" + hex.slice(64, 128)) as `0x${string}`;
    let v = parseInt(hex.slice(128, 130), 16);
    if (v < 27) v += 27;

    const txHash = await wallet.writeContract({
      address: router,
      abi: routerAbi,
      functionName: "gaslessTransfer",
      args: [token, getAddress(buyer), getAddress(merchant), BigInt(amount), BigInt(deadline), v as 27 | 28, r, s],
    });

    const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
    return NextResponse.json({ routerTx: txHash, status: receipt.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


