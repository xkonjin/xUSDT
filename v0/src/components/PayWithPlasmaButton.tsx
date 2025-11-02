"use client";

import React, { useCallback, useMemo, useState } from "react";

type Props = {
  defaultAmount?: string; // decimal string, e.g. "0.10"
};

function toAtomic(amountDecimal: string): bigint {
  const [i, f = ""] = amountDecimal.trim().split(".");
  const frac = (f + "000000").slice(0, 6);
  const s = `${i || "0"}${frac}`.replace(/^0+(?=\d)/, "");
  return BigInt(s.length ? s : "0");
}

function to0xHex(value: bigint): `0x${string}` {
  return ("0x" + value.toString(16)) as `0x${string}`;
}

function pad32(hexNo0x: string): string {
  return hexNo0x.padStart(64, "0");
}

async function ensureChain(targetChainIdDec: number, rpcUrl?: string) {
  const eth = (globalThis as any).ethereum;
  if (!eth) throw new Error("No wallet (window.ethereum) detected");
  const targetHex = "0x" + targetChainIdDec.toString(16);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
  } catch (e: any) {
    // 4902 = unknown chain; try to add
    if (e?.code === 4902 && rpcUrl) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: targetHex, chainName: "Plasma", rpcUrls: [rpcUrl], nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 } }],
      });
    } else {
      throw e;
    }
  }
}

export default function PayWithPlasmaButton({ defaultAmount = "0.10" }: Props) {
  const [amount, setAmount] = useState<string>(defaultAmount);
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const atomic = useMemo(() => {
    try {
      return toAtomic(amount);
    } catch {
      return 0n;
    }
  }, [amount]);

  const onPay = useCallback(async () => {
    setBusy(true);
    setStatus("");
    setTxHash("");
    try {
      const eth = (globalThis as any).ethereum;
      if (!eth) throw new Error("Wallet not found");

      // Optional: use NEXT_PUBLIC vars for client-side chain hints
      const chainIdHint = Number(process.env.NEXT_PUBLIC_PLASMA_CHAIN_ID || 9745);
      const rpcHint = process.env.NEXT_PUBLIC_PLASMA_RPC as string | undefined;
      await ensureChain(chainIdHint, rpcHint);

      // Get account
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const buyer = accounts[0];
      if (!buyer) throw new Error("No account");

      if (atomic <= 0n) throw new Error("Amount must be > 0");

      setStatus("Preparing checkout…");
      const checkoutRes = await fetch("/api/checkout_total", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buyer, amountAtomic: atomic.toString() }),
      });
      if (!checkoutRes.ok) throw new Error(await checkoutRes.text());
      const payload = await checkoutRes.json();

      const token: string = payload?.message?.token;
      const router: string = payload?.domain?.verifyingContract;
      const deadline: string = payload?.message?.deadline;
      if (!token || !router || !deadline) throw new Error("Malformed checkout payload");

      // Step 1: ensure allowance >= amount
      setStatus("Checking allowance…");
      const allowanceData =
        "0xdd62ed3e" + // allowance(address,address)
        pad32((buyer as string).toLowerCase().replace(/^0x/, "")) +
        pad32((router as string).toLowerCase().replace(/^0x/, ""));
      const allowanceHex: `0x${string}` = await eth.request({
        method: "eth_call",
        params: [{ to: token, data: allowanceData }, "latest"],
      });
      const allowance = BigInt(allowanceHex);
      if (allowance < atomic) {
        setStatus("Approving spending…");
        const approveData =
          "0x095ea7b3" + // approve(address,uint256)
          pad32((router as string).toLowerCase().replace(/^0x/, "")) +
          pad32(atomic.toString(16));
        const approveTx = await eth.request({
          method: "eth_sendTransaction",
          params: [{ from: buyer, to: token, value: "0x0", data: approveData }],
        });
        // eslint-disable-next-line no-console
        console.log("approve tx:", approveTx);
      }

      // Step 2: sign typed data
      setStatus("Awaiting signature…");
      const typedData = {
        domain: payload.domain,
        types: payload.types,
        primaryType: "Transfer",
        message: payload.message,
      };
      const signature: string = await eth.request({
        method: "eth_signTypedData_v4",
        params: [buyer, JSON.stringify(typedData)],
      });

      // Step 3: relay
      setStatus("Relaying payment…");
      const relayRes = await fetch("/api/relay_total", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buyer, amount: atomic.toString(), deadline, signature }),
      });
      if (!relayRes.ok) throw new Error(await relayRes.text());
      const relayed = await relayRes.json();
      setTxHash(relayed?.routerTx || "");
      setStatus("Success");
    } catch (e: any) {
      setStatus(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [amount, atomic]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in USD₮ (e.g. 0.10)"
        style={{ padding: 8, border: "1px solid #ddd", borderRadius: 6, minWidth: 160 }}
      />
      <button
        onClick={onPay}
        disabled={busy || atomic <= 0n}
        style={{
          padding: "10px 16px",
          background: "black",
          color: "white",
          borderRadius: 8,
          border: 0,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Processing…" : "Pay with Plasma"}
      </button>
      {status && <span style={{ fontSize: 12, color: status === "Success" ? "#0a0" : "#555" }}>{status}</span>}
      {txHash && (
        <div style={{ width: "100%", fontSize: 12, color: "#333" }}>
          Tx: {txHash}
        </div>
      )}
    </div>
  );
}


