"use client";
import React, { useEffect, useState } from "react";
import { encodeApprove, signTypedDataV4, type EthereumProvider } from "@/app/lib/rpc";
import { useCart } from "@/app/lib/cart";
import { useWallet } from "@/app/lib/wallet";

type Toy = {
  toyId: number;
  emoji: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  r: number;
};

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-5xl font-light tracking-tight text-neutral-200 text-balance">{title}</h1>
      {subtitle && <p className="text-neutral-400">{subtitle}</p>}
      <div className="h-1 w-24 bg-neutral-700" />
    </div>
  );
}

export default function ToysPage() {
  const [catalog, setCatalog] = useState<Toy[]>([]);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const { add } = useCart();
  const { account, connect, connected } = useWallet();
  const [cfg, setCfg] = useState<{ router?: string; token?: string; prefer3009?: boolean } | null>(null);
  const [approving, setApproving] = useState(false);
  const [allowance, setAllowance] = useState<number>(0);

  useEffect(() => {
    fetch("/api/toys").then(r => r.json()).then(d => setCatalog(d.toys || []));
    fetch("/api/config").then(r => r.json()).then(setCfg);
  }, []);

  useEffect(() => {
    const load = async () => {
      for (const t of catalog) {
        try {
          const r = await fetch(`/api/price?toyId=${t.toyId}`, { cache: "no-store" });
          const d = await r.json();
          if (d.price) setPrices(p => ({ ...p, [t.toyId]: d.price }));
        } catch {}
      }
    };
    if (catalog.length) load();
  }, [catalog]);

  async function refreshAllowance(addr: string) {
    const r = await fetch(`/api/allowance?owner=${addr}`, { cache: "no-store" });
    const d = await r.json();
    if (!d.error && typeof d.allowanceFloat === "number") setAllowance(d.allowanceFloat);
  }

  useEffect(() => {
    if (connected && account && !cfg?.prefer3009) refreshAllowance(account);
  }, [connected, account, cfg?.prefer3009]);

  async function approve() {
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth || !account) return alert("Connect wallet first");
    if (!cfg?.token || !cfg?.router) return alert("Server missing config");
    setApproving(true);
    try {
      const data = encodeApprove(cfg.router, (2n ** 256n - 1n));
      const tx = (await eth.request({ method: "eth_sendTransaction", params: [{ from: account, to: cfg.token as string, data }] })) as string;
      await refreshAllowance(account);
      alert(`Approve sent: ${tx}`);
    } catch (e) {
      alert(String(e));
    } finally {
      setApproving(false);
    }
  }

  async function checkout(toyId: number) {
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth || !account) return alert("Connect wallet first");

    if (!cfg || cfg.prefer3009) {
      // EIP-3009 flow (no-approve)
      const res = await fetch("/api/checkout3009", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toyId, buyer: account }) });
      const { typedData, amount, validAfter, validBefore, nonce, error } = await res.json();
      if (error || !typedData) return alert(error || "Server failed to prepare checkout (3009)");
      const sig = await signTypedDataV4(account, typedData);
      const relay = await fetch("/api/relay3009", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toyId, buyer: account, amount, validAfter, validBefore, nonce, signature: sig }) });
      const body = await relay.json();
      if (body.error) return alert(body.error);
      alert(`Paid & minted. Transfer tx: ${body.transferTx}\nMint tx: ${body.mintTx}`);
      return;
    }

    // Fallback: router flow (requires approval)
    const res = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toyId, buyer: account }) });
    const { typedData, amount, deadline, error } = await res.json();
    if (error || !typedData) return alert(error || "Server failed to prepare checkout");
    const sig = await signTypedDataV4(account, typedData);
    const relay = await fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toyId, buyer: account, amount, deadline, signature: sig }) });
    const body = await relay.json();
    if (body.error) return alert(body.error);
    alert(`Paid & minted. Router tx: ${body.routerTx}\nMint tx: ${body.mintTx}`);
  }

  const approved = allowance > 1;
  const showApprove = cfg?.prefer3009 === false;
  const cfgReady = Boolean(cfg);

  return (
    <div className="px-16 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <SectionHeader title="Trillionaire Toys Store" subtitle="Collect emoji toys as NFTs on Plasma" />
        <div className="flex items-center gap-3">
          <div className="text-neutral-400 text-sm">{account ? account.slice(0,6)+"…"+account.slice(-4) : "Not connected"}</div>
          <button onClick={connect} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2 px-4">{account ? "Switch / Reconnect" : "Connect Wallet"}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {catalog.map((t) => (
          <div key={t.toyId} className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4 space-y-3">
            <div className="text-5xl">{t.emoji}</div>
            <div className="text-neutral-300 text-xl font-light">{t.name}</div>
            <div className="text-neutral-400 text-sm">Bonding curve pricing</div>
            <div className="text-emerald-400 h-6">
              {prices[t.toyId] ? `${prices[t.toyId].toFixed(6)} USDT0` : <span className="inline-block h-4 w-24 bg-neutral-700 rounded animate-pulse" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => add(t.toyId, 1)} className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2">Add to cart</button>
              <button disabled={!cfgReady} onClick={() => checkout(t.toyId)} className="w-full bg-emerald-600/20 border border-emerald-400/30 hover:bg-emerald-600/30 text-emerald-300 rounded-md py-2 disabled:opacity-50">Buy now</button>
            </div>
          </div>
        ))}
      </div>
      {showApprove ? (
        <div className="bg-neutral-800/20 border border-neutral-700/50 rounded p-4 text-neutral-400 text-sm">
          <div className="flex items-center justify-between">
            <span>USDT0 Allowance for Router</span>
            <span className={approved ? "text-emerald-400" : "text-amber-400"}>{approved ? `Approved ✓ (${allowance.toFixed(2)} USDT0)` : "Needs approval"}</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button disabled={approving || approved} onClick={approve} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2 px-4 disabled:opacity-50">{approving ? "Approving…" : approved ? "Approved" : "Approve USDT0"}</button>
            <button onClick={() => account && refreshAllowance(account)} className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded-md py-2 px-4">Refresh</button>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-800/20 border border-neutral-700/50 rounded p-4 text-neutral-400 text-sm">
          No approval needed — purchases use EIP‑3009 signed authorization.
        </div>
      )}
    </div>
  );
}
