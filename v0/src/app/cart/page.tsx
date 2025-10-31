"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "@/app/lib/cart";
import type { EthereumProvider } from "@/app/lib/rpc";
import { signTypedDataV4 } from "@/app/lib/rpc";
import { useWallet } from "@/app/lib/wallet";

type Toy = { toyId: number; emoji: string; name: string };

type CartItem = { toyId: number; qty: number };

export default function CartPage() {
  const { cart, clear } = useCart();
  const [catalog, setCatalog] = useState<Toy[]>([]);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const { account, connect } = useWallet();
  const [cfg, setCfg] = useState<{ prefer3009?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch("/api/toys").then(r => r.json()).then(d => setCatalog(d.toys || [])); }, []);
  useEffect(() => { fetch("/api/config").then(r => r.json()).then(setCfg); }, []);

  useEffect(() => {
    const load = async () => {
      await Promise.all(Object.keys(cart).map(async (k) => {
        const id = Number(k);
        try {
          const r = await fetch(`/api/price?toyId=${id}`, { cache: "no-store" });
          const d = await r.json();
          if (d.price) setPrices(p => ({ ...p, [id]: d.price }));
        } catch {}
      }));
    };
    if (Object.keys(cart).length) load();
  }, [cart]);

  const items = useMemo(() => {
    const byId: Record<number, Toy> = Object.fromEntries(catalog.map(t => [t.toyId, t]));
    return Object.entries(cart).map(([toyIdStr, qty]) => {
      const toyId = Number(toyIdStr);
      const meta = byId[toyId];
      return { toyId, qty, meta, price: prices[toyId] || 0 };
    });
  }, [catalog, cart, prices]);

  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  async function buyAll() {
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth) return alert("Install Rabby/MetaMask");
    if (!account) return alert("Connect wallet first");
    setBusy(true);
    try {
      const payloadItems: CartItem[] = items.map(i => ({ toyId: i.toyId, qty: i.qty }));
      // Request a single-authorization typed data for the total
      const r1 = await fetch("/api/checkout3009_total", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ buyer: account, items: payloadItems }) });
      const j1 = await r1.json();
      if (j1.error || !j1.typedData) throw new Error(j1.error || "checkout (total) failed");
      const sig = await signTypedDataV4(account, j1.typedData);
      const r2 = await fetch("/api/relay3009_total", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ buyer: account, amount: j1.total, validAfter: j1.params.validAfter, validBefore: j1.params.validBefore, nonce: j1.params.nonce, signature: sig, items: payloadItems }) });
      const j2 = await r2.json();
      if (j2.error) throw new Error(j2.error);
      clear();
      alert(`Transfer: ${j2.transferTx}\nMinted: ${j2.mints?.length ?? 0}`);
    } catch (e) {
      alert(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-16 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-light tracking-tight text-neutral-200">Your Cart</h1>
        <div className="flex items-center gap-3">
          <div className="text-neutral-400 text-sm">{account ? account.slice(0,6)+"…"+account.slice(-4) : "Not connected"}</div>
          <button onClick={connect} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2 px-4">{account ? "Switch / Reconnect" : "Connect Wallet"}</button>
        </div>
      </div>
      <div className="space-y-4">
        {items.length === 0 && <div className="text-neutral-400">No items yet.</div>}
        {items.map((it) => (
          <div key={it.toyId} className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4 grid grid-cols-6 items-center">
            <div className="col-span-3 flex items-center gap-3">
              <div className="text-3xl">{it.meta?.emoji || "🎁"}</div>
              <div className="text-neutral-300">{it.meta?.name || `Toy #${it.toyId}`}</div>
            </div>
            <div className="text-neutral-400">x{it.qty}</div>
            <div className="text-neutral-400">{it.price ? it.price.toFixed(6) : "—"} USDT0</div>
            <div className="text-emerald-400 text-right">{it.price ? (it.qty * it.price).toFixed(6) : "—"} USDT0</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-neutral-300">Total</div>
        <div className="text-emerald-400 text-xl">{total.toFixed(6)} USDT0</div>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy || items.length === 0} onClick={buyAll} className="bg-emerald-600/20 border border-emerald-400/30 hover:bg-emerald-600/30 text-emerald-300 rounded-md py-2 px-4 disabled:opacity-50">{busy ? "Processing…" : "Checkout & Buy (1 signature)"}</button>
        <button disabled={busy || items.length === 0} onClick={clear} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2 px-4 disabled:opacity-50">Clear</button>
      </div>
    </div>
  );
}
