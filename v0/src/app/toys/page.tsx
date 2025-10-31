"use client";
import React, { useEffect, useState } from "react";
import { encodeApprove, signTypedDataV4, type EthereumProvider } from "@/app/lib/rpc";

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
  const [, setCart] = useState<Record<number, number>>({});
  const [account, setAccount] = useState<string>("");

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

  async function connect() {
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth) return alert("Install Rabby/MetaMask");
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    setAccount(accounts[0]);
    // ensure Plasma chain
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2611" }] }); // 9745
    } catch {
      await eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x2611", chainName: "Plasma", nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 }, rpcUrls: ["https://rpc.plasma.to"], blockExplorerUrls: [] }] });
    }
  }

  async function approve() {
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth || !account) return alert("Connect wallet first");
    const cfg = await (await fetch("/api/config", { cache: "no-store" })).json();
    if (!cfg.token || !cfg.router) return alert("Server missing config");
    const data = encodeApprove(cfg.router, (2n ** 256n - 1n));
    const tx = (await eth.request({ method: "eth_sendTransaction", params: [{ from: account, to: cfg.token as string, data }] })) as string;
    alert(`Approve sent: ${tx}`);
  }

  async function checkout(toyId: number) {
    const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
    if (!eth || !account) return alert("Connect wallet first");
    const res = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toyId, buyer: account }) });
    const { typedData, amount, deadline, error } = await res.json();
    if (error || !typedData) return alert(error || "Server failed to prepare checkout");
    const sig = await signTypedDataV4(account, typedData);
    const relay = await fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ toyId, buyer: account, amount, deadline, signature: sig }) });
    const body = await relay.json();
    if (body.error) return alert(body.error);
    alert(`Paid & minted. Router tx: ${body.routerTx}\nMint tx: ${body.mintTx}`);
  }

  const addToCart = (toyId: number) => setCart(c => ({ ...c, [toyId]: (c[toyId] || 0) + 1 }));

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
            <div className="text-emerald-400">{prices[t.toyId] ? `${prices[t.toyId].toFixed(6)} USDT0` : "—"}</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addToCart(t.toyId)} className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2">Add to cart</button>
              <button onClick={() => checkout(t.toyId)} className="w-full bg-emerald-600/20 border border-emerald-400/30 hover:bg-emerald-600/30 text-emerald-300 rounded-md py-2">Buy now</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-neutral-800/20 border border-neutral-700/50 rounded p-4 text-neutral-400 text-sm">
        Tip: Approve USDT0 to the router once, then purchases won’t prompt approvals.
        <div className="mt-3">
          <button onClick={approve} className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md py-2 px-4">Approve USDT0</button>
        </div>
      </div>
    </div>
  );
}
