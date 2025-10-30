"use client";

import { useCallback, useMemo, useState } from "react";
import { buildTransferWithAuthorization, fetchTokenNameAndVersion, splitSignature } from "../lib/eip3009";
import { waitForReceipt } from "../lib/rpc";

const DEFAULTS = {
  PLASMA_RPC: "https://rpc.plasma.to",
  PLASMA_CHAIN_ID: 9745,
  USDT0_ADDRESS: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
  MERCHANT_URL: "http://127.0.0.1:8000",
  PAY_AMOUNT_ATOMIC: 100000, // 0.1 USDT0
};

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

type PaymentRequired = {
  invoiceId: string;
  paymentOptions: Array<{
    network: "plasma" | "ethereum";
    chainId: number;
    token: string;
    recipient: string;
    amount: string;
    decimals: number;
    scheme: string;
    nonce?: string | number;
    deadline: number;
  }>;
};

type PaymentCompleted = {
  txHash: string;
  status: string;
  network: string;
  receipt?: unknown;
};

function JsonCard({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-lg border border-gray-300 dark:border-neutral-700 p-4">
      <div className="font-semibold mb-2">{title}</div>
      <pre className="text-xs overflow-auto max-h-80">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function StatusLamp({ status }: { status: "idle" | "pending" | "confirmed" | "failed" }) {
  const color = status === "confirmed" ? "bg-green-500" : status === "failed" ? "bg-red-500" : status === "pending" ? "bg-yellow-500" : "bg-gray-400";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />;
}

export default function ClientPage() {
  const [merchantUrl, setMerchantUrl] = useState(DEFAULTS.MERCHANT_URL);
  const [amountAtomic, setAmountAtomic] = useState<number>(DEFAULTS.PAY_AMOUNT_ATOMIC);
  const [pr, setPr] = useState<PaymentRequired | null>(null);
  const [sku, setSku] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [completed, setCompleted] = useState<PaymentCompleted | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [explorerBase, setExplorerBase] = useState<string>("");

  const plasmaOption = useMemo(() => {
    if (!pr) return null;
    return pr.paymentOptions.find((o) => o.network === "plasma");
  }, [pr]);

  const connectWallet = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) throw new Error("No injected wallet found");
    const addrs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    const addr = addrs[0];
    setAccount(addr || null);
    return addr || null;
  }, []);

  const requestResource = useCallback(async () => {
    setBusy(true);
    setPr(null);
    setCompleted(null);
    setTxHash(null);
    setTxStatus("idle");
    setErrorMsg("");
    try {
      const url = new URL("/api/premium", window.location.origin);
      url.searchParams.set("merchantUrl", merchantUrl);
      if (sku.trim()) url.searchParams.set("sku", sku.trim());
      const r = await fetch(url.toString(), { cache: "no-store" });
      const raw = await r.text();
      let parsed: unknown = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw || null; }
      if (r.status !== 402) {
        setErrorMsg(`Unexpected status ${r.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
      } else {
        setPr(parsed as PaymentRequired);
      }
    } finally {
      setBusy(false);
    }
  }, [merchantUrl, sku]);

  const signAndPay = useCallback(async () => {
    if (!plasmaOption) throw new Error("No Plasma option in PaymentRequired");
    const eth = window.ethereum;
    if (!eth) throw new Error("No injected wallet");
    const fromMaybe = account || (await connectWallet());
    if (!fromMaybe) throw new Error("Wallet not connected");
    const from = fromMaybe as string;

    // Pull fields from PR
    const token = plasmaOption.token;
    const to = plasmaOption.recipient; // merchant
    const chainId = plasmaOption.chainId || DEFAULTS.PLASMA_CHAIN_ID;
    const deadline = plasmaOption.deadline;
    const nonce32 = (typeof plasmaOption.nonce === "string" ? plasmaOption.nonce : undefined) ||
      ("0x" + crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), ""));
    const validAfter = Math.floor(Date.now() / 1000) - 1;
    const validBefore = deadline;
    const value = amountAtomic;

    // Fetch token name/version (fallback to USDTe/1)
    const { name, version } = await fetchTokenNameAndVersion(DEFAULTS.PLASMA_RPC, token).catch(() => ({ name: "USDTe", version: "1" }));
    const typed = buildTransferWithAuthorization(name, version, chainId, token, from, to, value, validAfter, validBefore, nonce32);

    // Request signature (EIP-712)
    const sigHex = (await eth.request({
      method: "eth_signTypedData_v4",
      params: [from, JSON.stringify(typed)],
    })) as string;
    const { v, r, s } = splitSignature(sigHex);

    const payload = {
      type: "payment-submitted",
      invoiceId: pr?.invoiceId,
      chosenOption: {
        network: "plasma",
        chainId,
        token,
        amount: String(value),
        from,
        to,
        nonce: nonce32,
        deadline: validBefore,
        validAfter,
        validBefore,
      },
      signature: { v, r, s },
      scheme: "eip3009-transfer-with-auth",
    };

    // Proxy to merchant
    const resp = await fetch("/api/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchantUrl, payload }),
    });
    const raw = await resp.text();
    let parsed: unknown = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw || null; }
    if (!resp.ok) {
      setErrorMsg(`Payment failed (${resp.status}): ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
    }
    setCompleted(parsed as PaymentCompleted);
    const txh = (parsed as { txHash?: string } | null | undefined)?.txHash as string | undefined;
    if (txh && txh !== "0x0") {
      setTxHash(txh);
      setTxStatus("pending");
      try {
        const receipt = (await waitForReceipt(DEFAULTS.PLASMA_RPC, txh, 60, 1500)) as { status: string | number };
        const st = typeof receipt.status === "string" ? parseInt(receipt.status, 16) : Number(receipt.status);
        setTxStatus(st === 1 ? "confirmed" : "failed");
      } catch {
        setTxStatus("failed");
      }
    }
  }, [plasmaOption, merchantUrl, amountAtomic, account, connectWallet, pr]);

  const explorerHref = useMemo(() => {
    if (!explorerBase || !txHash) return null;
    return `${explorerBase.replace(/\/$/, "")}/tx/${txHash}`;
  }, [explorerBase, txHash]);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Client Demo</h1>
      <div className="grid gap-4">
        <div className="grid gap-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm opacity-80">Merchant URL</span>
            <input
              value={merchantUrl}
              onChange={(e) => setMerchantUrl(e.target.value)}
              className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
              placeholder="http://127.0.0.1:8000"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm opacity-80">Amount (atomic, 6 decimals)</span>
            <input
              type="number"
              value={amountAtomic}
              onChange={(e) => setAmountAtomic(parseInt(e.target.value || "0", 10))}
              className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
              placeholder="100000"
            />
            <span className="text-xs opacity-60">{(amountAtomic / 1_000_000).toFixed(6)} USDT0</span>
          </label>
        </div>
        <label className="grid gap-1">
          <span className="text-sm opacity-80">SKU (optional, e.g., premium)</span>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
            placeholder="premium"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={connectWallet}
            className="rounded-md border px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800/30"
          >
            {account ? `Wallet: ${account.slice(0, 6)}…${account.slice(-4)}` : "Connect Wallet"}
          </button>
          <button
            onClick={requestResource}
            disabled={busy}
            className="rounded-md border px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800/30 disabled:opacity-50"
          >
            {busy ? "Requesting…" : "Request resource (402)"}
          </button>
          <button
            onClick={signAndPay}
            disabled={!pr || !plasmaOption}
            className="rounded-md border px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800/30 disabled:opacity-50"
          >
            Sign & Pay (EIP‑3009)
          </button>
          <button
            onClick={() => { setPr(null); setCompleted(null); setTxHash(null); setTxStatus("idle"); setErrorMsg(""); }}
            className="rounded-md border px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800/30"
          >
            Reset
          </button>
        </div>

        {errorMsg ? (
          <div className="rounded-md border border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
            {errorMsg}
          </div>
        ) : null}

        <div className="grid gap-4">
          {pr ? <JsonCard title="PaymentRequired" data={pr} /> : null}
          {completed ? <JsonCard title="PaymentCompleted" data={completed} /> : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span>Tx status:</span>
            <StatusLamp status={txStatus} />
            <code className="text-xs">{txHash || "—"}</code>
          </div>
          <label className="grid gap-1">
            <span className="text-sm opacity-80">Explorer base URL (optional)</span>
            <input
              value={explorerBase}
              onChange={(e) => setExplorerBase(e.target.value)}
              className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
              placeholder="https://explorer.plasma.to"
            />
          </label>
          {explorerHref ? (
            <a href={explorerHref} target="_blank" className="text-blue-600 underline text-sm">
              Open in explorer ↗
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}


