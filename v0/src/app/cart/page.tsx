"use client";
import React, { useEffect, useState } from "react";

type Toy = {
  toyId: number;
  emoji: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  r: number;
};

export default function CartPage() {
  const [catalog, setCatalog] = useState<Toy[]>([]);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [cart] = useState<Record<number, number>>({});

  useEffect(() => { fetch("/api/toys").then(r => r.json()).then(d => setCatalog(d.toys || [])); }, []);
  useEffect(() => {
    const load = async () => { for (const t of catalog) { try { const r = await fetch(`/api/price?toyId=${t.toyId}`); const d = await r.json(); if (d.price) setPrices(p => ({ ...p, [t.toyId]: d.price })); } catch {} } };
    if (catalog.length) load();
  }, [catalog]);

  const items = catalog.filter(t => cart[t.toyId]).map(t => ({ ...t, qty: cart[t.toyId], price: prices[t.toyId] || 0 }));
  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  return (
    <div className="px-16 py-8 space-y-8">
      <h1 className="text-5xl font-light tracking-tight text-neutral-200">Your Cart</h1>
      <div className="space-y-4">
        {items.length === 0 && <div className="text-neutral-400">No items yet.</div>}
        {items.map((it) => (
          <div key={it.toyId} className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{it.emoji}</div>
              <div className="text-neutral-300">{it.name}</div>
            </div>
            <div className="text-neutral-400">x{it.qty}</div>
            <div className="text-emerald-400">{(it.qty * it.price).toFixed(6)} USDT0</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-neutral-300">Total</div>
        <div className="text-emerald-400 text-xl">{total.toFixed(6)} USDT0</div>
      </div>
      <button className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2 px-4" onClick={() => alert("Checkout wiring pending env: ROUTER_ADDRESS, USDT0_ADDRESS, NFT_CONTRACT")}>Checkout</button>
    </div>
  );
}
