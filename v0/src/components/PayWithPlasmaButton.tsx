"use client";

import React, { useCallback, useMemo, useState } from "react";
import { buildTransferWithAuthorization, fetchTokenNameAndVersion, splitSignature } from "../app/lib/eip3009";
import { waitForReceipt } from "../app/lib/rpc";
import Field from "./ui/Field";
import Button from "./ui/Button";

type RequestParams = { method: string; params?: unknown[] | Record<string, unknown> };
type EthereumProvider = { request: (args: RequestParams) => Promise<unknown> };

type PaymentOption = {
  network: string;
  chainId?: number | string;
  token: string;
  recipient: string;
  deadline: number | string;
  nonce?: string;
};

type PaymentRequired = {
  invoiceId: string;
  paymentOptions: PaymentOption[];
};

type PayResponse = {
  status?: string;
  txHash?: string;
};

type Props = {
  defaultAmount?: string; // decimal string, e.g. "0.10"
};

function toAtomic(amountDecimal: string): bigint {
  const [i, f = ""] = amountDecimal.trim().split(".");
  const frac = (f + "000000").slice(0, 6);
  const s = `${i || "0"}${frac}`.replace(/^0+(?=\d)/, "");
  return BigInt(s.length ? s : "0");
}

// Type guards to validate unknown JSON structures
function isPaymentOption(value: unknown): value is PaymentOption {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.network === "string" && typeof v.token === "string" && typeof v.recipient === "string";
}

function isPaymentRequired(value: unknown): value is PaymentRequired {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const opts = v.paymentOptions as unknown;
  return typeof v.invoiceId === "string" && Array.isArray(opts) && opts.every(isPaymentOption);
}

function isPayResponse(value: unknown): value is PayResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const st = v.status;
  const th = v.txHash;
  return (st === undefined || typeof st === "string") && (th === undefined || typeof th === "string");
}

async function ensureChain(targetChainIdDec: number, rpcUrl?: string) {
  const eth = (globalThis as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!eth) throw new Error("No wallet (window.ethereum) detected");
  const targetHex = "0x" + targetChainIdDec.toString(16);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
  } catch (e: unknown) {
    // 4902 = unknown chain; try to add
    const code = typeof e === "object" && e && "code" in e ? Number((e as { code?: unknown }).code) : undefined;
    if (code === 4902 && rpcUrl) {
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
      const eth = (globalThis as unknown as { ethereum?: EthereumProvider }).ethereum;
      if (!eth) throw new Error("Wallet not found");

      // Get account
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const buyer = accounts[0];
      if (!buyer) throw new Error("No account");

      if (atomic <= 0n) throw new Error("Amount must be > 0");

      // Fetch PaymentRequired (402) for invoice and plasma option
      setStatus("Preparing checkout…");
      const prRes = await fetch("/api/premium", { method: "GET", cache: "no-store" });
      const prRaw = await prRes.text();
      let prUnknown: unknown = null; try { prUnknown = prRaw ? JSON.parse(prRaw) : null; } catch { prUnknown = null; }
      if (!isPaymentRequired(prUnknown)) throw new Error("Merchant did not return PaymentRequired");
      const pr = prUnknown;
      const plasmaOpt = pr.paymentOptions.find((o) => o.network === "plasma");
      if (!plasmaOpt) throw new Error("No Plasma option available");

      // Ensure chain
      const chainId = Number(plasmaOpt.chainId || process.env.NEXT_PUBLIC_PLASMA_CHAIN_ID || 9745);
      const rpcHint = process.env.NEXT_PUBLIC_PLASMA_RPC as string | undefined;
      await ensureChain(chainId, rpcHint);

      // Build EIP-3009 typed data
      const token = plasmaOpt.token as string;
      const to = plasmaOpt.recipient as string;
      const deadline = Number(plasmaOpt.deadline);
      const validAfter = Math.floor(Date.now() / 1000) - 1;
      const validBefore = deadline;
      const nonce32: string = typeof plasmaOpt.nonce === "string" && plasmaOpt.nonce
        ? (plasmaOpt.nonce.startsWith("0x") ? plasmaOpt.nonce : ("0x" + plasmaOpt.nonce))
        : ("0x" + crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), ""));

      setStatus("Fetching token metadata…");
      const { name, version } = await fetchTokenNameAndVersion(process.env.NEXT_PUBLIC_PLASMA_RPC || "https://rpc.plasma.to", token).catch(() => ({ name: "USDTe", version: "1" }));
      const typed = buildTransferWithAuthorization(name, version, chainId, token, buyer, to, atomic.toString(), validAfter, validBefore, nonce32);

      setStatus("Awaiting signature…");
      let sigHex: string;
      try {
        sigHex = (await eth.request({ method: "eth_signTypedData_v4", params: [buyer, JSON.stringify(typed)] })) as string;
      } catch {
        try {
          sigHex = (await eth.request({ method: "eth_signTypedData", params: [buyer, typed as unknown as object] })) as string;
        } catch {
          sigHex = (await eth.request({ method: "eth_signTypedData", params: [buyer, JSON.stringify(typed)] })) as string;
        }
      }
      const { v, r, s } = splitSignature(sigHex);

      // Relay via /api/pay
      setStatus("Relaying payment…");
      const payload = {
        type: "payment-submitted",
        invoiceId: pr.invoiceId,
        chosenOption: {
          network: "plasma",
          chainId,
          token,
          amount: atomic.toString(),
          from: buyer,
          to,
          nonce: nonce32,
          deadline: validBefore,
          validAfter,
          validBefore,
        },
        signature: { v, r, s },
        scheme: "eip3009-transfer-with-auth",
      };

      const payRes = await fetch("/api/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ merchantUrl: undefined, payload }) });
      const payRaw = await payRes.text();
      let completedUnknown: unknown = null; try { completedUnknown = payRaw ? JSON.parse(payRaw) : null; } catch { completedUnknown = null; }
      if (!isPayResponse(completedUnknown)) throw new Error("Empty or invalid response from server");
      const completed = completedUnknown;
      const txh = completed.txHash;
      if (txh) setTxHash(txh);
      setStatus(completed.status === "confirmed" ? "Success" : completed.status || "Pending");

      if (txh && (!completed.status || completed.status === "pending")) {
        try {
          const receipt = await waitForReceipt(process.env.NEXT_PUBLIC_PLASMA_RPC || "https://rpc.plasma.to", txh, 60, 1500);
          const statusUnknown = (receipt as { status?: string | number } | undefined)?.status;
          const st = typeof statusUnknown === "string" ? parseInt(statusUnknown, 16) : Number(statusUnknown);
          setStatus(st === 1 ? "Success" : "Failed");
        } catch {
          setStatus("Failed");
        }
      }
    } catch (e: unknown) {
      const msg = typeof e === "object" && e && "message" in e ? String((e as { message?: unknown }).message) : String(e);
      setStatus(msg);
    } finally {
      setBusy(false);
    }
  }, [atomic]);

  return (
    <div className="xui-grid" style={{ alignItems: "end" }}>
      <Field
        label="Amount (USD₮)"
        placeholder="0.10"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
        trailing={<span style={{ opacity: 0.8 }}>USDT0</span>}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Button onClick={onPay} disabled={busy || atomic <= 0n} variant="premium">
          {busy ? "Processing…" : "Pay with Plasma"}
        </Button>
        {status ? (
          <span className="xui-status">{status}</span>
        ) : null}
      </div>
      {txHash ? (
        <div className="xui-chip success">
          <span className="dot" />
          <span>Tx</span>
          <code style={{ fontSize: 12 }}>{txHash}</code>
        </div>
      ) : null}
    </div>
  );
}


