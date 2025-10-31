"use client";

import { useCallback, useMemo, useState } from "react";
import { buildTransferWithAuthorization, fetchTokenNameAndVersion, splitSignature } from "../lib/eip3009";
import { waitForReceipt } from "../lib/rpc";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { Button } from "../../components/ui/Button";

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
  const [premium, setPremium] = useState<unknown | null>(null);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [explorerBase, setExplorerBase] = useState<string>("");

  const plasmaOption = useMemo(() => {
    if (!pr) return null;
    return pr.paymentOptions.find((o) => o.network === "plasma");
  }, [pr]);

  const toMessage = (e: unknown): string => {
    if (!e) return "Unknown error";
    if (e instanceof Error && e.message) return e.message;
    try { return JSON.stringify(e); } catch { return String(e); }
  };

  const connectWallet = useCallback(async () => {
    try {
      const eth = window.ethereum;
      if (!eth) throw new Error("No injected wallet found");
      const addrs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const addr = addrs[0];
      setAccount(addr || null);
      return addr || null;
    }
    catch (err) {
      throw new Error(`Wallet connect failed: ${toMessage(err)}`);
    }
  }, []);

  const requestResource = useCallback(async () => {
    setBusy(true);
    setPr(null);
    setCompleted(null);
    setPremium(null);
    setTxHash(null);
    setTxStatus("idle");
    setErrorMsg("");
    try {
      const url = new URL("/api/premium", window.location.origin);
      url.searchParams.set("merchantUrl", merchantUrl);
      if (sku.trim()) url.searchParams.set("sku", sku.trim());
      if (completed?.invoiceId) url.searchParams.set("invoiceId", completed.invoiceId);
      const r = await fetch(url.toString(), { cache: "no-store" });
      const raw = await r.text();
      let parsed: unknown = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = raw || null; }
      if (r.status === 402) {
        setPr(parsed as PaymentRequired);
      } else if (r.ok) {
        setPr(null);
        setPremium(parsed);
        setErrorMsg("");
      } else {
        setErrorMsg(`Unexpected status ${r.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
      }
    } finally {
      setBusy(false);
    }
  }, [merchantUrl, sku]);

  const signAndPay = useCallback(async () => {
    setErrorMsg("");
    if (!plasmaOption) { setErrorMsg("No Plasma option in PaymentRequired"); setTxStatus("failed"); return; }
    const eth = window.ethereum;
    if (!eth) { setErrorMsg("No injected wallet"); setTxStatus("failed"); return; }
    const fromMaybe = (account || (await connectWallet())) as string | null;
    if (!fromMaybe) { setErrorMsg("Wallet not connected"); setTxStatus("failed"); return; }
    const from = fromMaybe as string;

    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2611" }] }).catch(() => {});

    const token = plasmaOption.token;
    const to = plasmaOption.recipient;
    const chainId = plasmaOption.chainId || DEFAULTS.PLASMA_CHAIN_ID;
    const deadline = plasmaOption.deadline;
    const providedNonce = typeof plasmaOption.nonce === "string" ? plasmaOption.nonce : undefined;
    const nonce32 = providedNonce
      ? (providedNonce.startsWith("0x") ? providedNonce : ("0x" + providedNonce))
      : ("0x" + crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), ""));
    const validAfter = Math.floor(Date.now() / 1000) - 1;
    const validBefore = deadline;
    const value = amountAtomic;

    const { name, version } = await fetchTokenNameAndVersion(DEFAULTS.PLASMA_RPC, token).catch(() => ({ name: "USDTe", version: "1" }));
    const typed = buildTransferWithAuthorization(name, version, chainId, token, from, to, value, validAfter, validBefore, nonce32);

    let sigHex: string;
    try {
      sigHex = (await eth.request({ method: "eth_signTypedData_v4", params: [from, JSON.stringify(typed)] })) as string;
    } catch (e) {
      setErrorMsg(`Signature rejected: ${toMessage(e)}`);
      setTxStatus("failed");
      return;
    }
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
      setTxStatus("failed");
      return;
    }
    setCompleted(parsed as PaymentCompleted);
    const p: Partial<PaymentCompleted> = (parsed || {}) as Partial<PaymentCompleted>;
    const statusFromServer = typeof p.status === "string" ? p.status.toLowerCase() : null;
    if (statusFromServer === "confirmed" || statusFromServer === "failed") {
      setTxStatus(statusFromServer as "confirmed" | "failed");
    }
    const txh = (p.txHash as string | undefined) || undefined;
    if (txh && txh !== "0x0") {
      setTxHash(txh);
      if (!statusFromServer) setTxStatus("pending");
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
    <main className="xui-grid" style={{ paddingTop: 16, paddingBottom: 32 }}>
      <h1 className="xui-card-title" style={{ fontSize: 22 }}>Client Demo</h1>
      <Card>
        <div className="xui-grid cols-2">
          <Field
            label="Merchant URL"
            placeholder="http://127.0.0.1:8000"
            value={merchantUrl}
            onChange={(e) => setMerchantUrl((e.target as HTMLInputElement).value)}
          />
          <Field
            type="number"
            label="Amount (atomic, 6 decimals)"
            placeholder="100000"
            value={amountAtomic}
            onChange={(e) => setAmountAtomic(parseInt((e.target as HTMLInputElement).value || "0", 10))}
            helpText={`${(amountAtomic / 1_000_000).toFixed(6)} USDT0`}
          />
        </div>
        <div className="xui-grid" style={{ marginTop: 8 }}>
          <Field
            label="SKU (optional, e.g., premium)"
            placeholder="premium"
            value={sku}
            onChange={(e) => setSku((e.target as HTMLInputElement).value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <Button onClick={connectWallet}>{account ? `Wallet: ${account.slice(0, 6)}…${account.slice(-4)}` : "Connect Wallet"}</Button>
          <Button onClick={requestResource} disabled={busy} variant="outline">{busy ? "Requesting…" : "Request resource (402)"}</Button>
          <Button onClick={signAndPay} disabled={!pr || !plasmaOption} variant="primary">Sign & Pay (EIP‑3009)</Button>
          <Button onClick={() => { setPr(null); setCompleted(null); setTxHash(null); setTxStatus("idle"); setErrorMsg(""); }} variant="ghost">Reset</Button>
        </div>

        {errorMsg ? (
          <div className="xui-card" style={{ padding: 12, borderColor: "#ef4444" }}>
            <div style={{ color: "#ef4444" }}>{errorMsg}</div>
          </div>
        ) : null}
      </Card>

      <Card title="Debug">
        <div className="xui-grid">
          {pr ? <JsonCard title="PaymentRequired" data={pr} /> : null}
          {completed ? <JsonCard title="PaymentCompleted" data={completed} /> : null}
          {premium ? <JsonCard title="Resource" data={premium} /> : null}
          <div className="xui-grid">
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <span>Tx status:</span>
              <StatusLamp status={txStatus} />
              <code style={{ fontSize: 12 }}>{txHash || "—"}</code>
            </div>
            <Field
              label="Explorer base URL (optional)"
              placeholder="https://explorer.plasma.to"
              value={explorerBase}
              onChange={(e) => setExplorerBase((e.target as HTMLInputElement).value)}
            />
            {explorerHref ? (
              <a href={explorerHref} target="_blank" className="xui-link" rel="noreferrer">
                Open in explorer ↗
              </a>
            ) : null}
          </div>
        </div>
      </Card>
    </main>
  );
}


