"use client";
import React, { useEffect, useState } from "react";
import { useWallet } from "@/app/lib/wallet";

export default function InventoryPage() {
  const { account, connect } = useWallet();
  const [tokens, setTokens] = useState<Array<{ tokenId: string; toyId: number; version: number; price: number }>>([]);

  useEffect(() => {
    if (!account) return;
    (async () => {
      const res = await fetch(`/api/inventory?owner=${account}`, { cache: "no-store" });
      const d = await res.json();
      setTokens(d.tokens || []);
    })();
  }, [account]);

  return (
    <div className="px-16 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-5xl font-light tracking-tight text-neutral-200">Your Inventory</h1>
        <div className="flex items-center gap-3">
          <div className="text-neutral-400 text-sm">{account ? account.slice(0,6)+"…"+account.slice(-4) : "Not connected"}</div>
          <button onClick={connect} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2 px-4">{account ? "Switch / Reconnect" : "Connect Wallet"}</button>
        </div>
      </div>
      <div className="space-y-4">
        {tokens.length === 0 && <div className="text-neutral-400">No items yet.</div>}
        {tokens.map((t) => (
          <div key={t.tokenId} className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
            <div className="text-neutral-300">Toy #{t.toyId} • v{t.version}</div>
            <div className="text-emerald-400">{t.price.toFixed(6)} USDT0</div>
            <div className="text-neutral-500 text-sm">Token ID: {t.tokenId}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
