"use client";
import React, { useEffect, useState } from "react";

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
  const [catalog, setCatalog] = useState<Array<any>>([]);
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [cart, setCart] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch("/api/toys").then(r => r.json()).then(d => setCatalog(d.toys || []));
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

  const addToCart = (toyId: number) => setCart(c => ({ ...c, [toyId]: (c[toyId] || 0) + 1 }));

  return (
    <div className="px-16 py-8 space-y-8">
      <SectionHeader title="Trillionaire Toys Store" subtitle="Collect emoji toys as NFTs on Plasma" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {catalog.map((t) => (
          <div key={t.toyId} className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4 space-y-3">
            <div className="text-5xl">{t.emoji}</div>
            <div className="text-neutral-300 text-xl font-light">{t.name}</div>
            <div className="text-neutral-400 text-sm">Bonding curve pricing</div>
            <div className="text-emerald-400">{prices[t.toyId] ? `${prices[t.toyId].toFixed(6)} USDT0` : "—"}</div>
            <button onClick={() => addToCart(t.toyId)} className="mt-2 w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2">
              Add to cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
