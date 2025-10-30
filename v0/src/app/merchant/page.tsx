"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULTS = {
  PLASMA_RPC: "https://rpc.plasma.to",
  PLASMA_CHAIN_ID: 9745,
  USDT0_ADDRESS: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb",
  MERCHANT_URL: "http://127.0.0.1:8000",
};

function StatusLamp({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`}
        aria-label={ok ? "ok" : "error"}
      />
      <span className="opacity-80">{message}</span>
    </div>
  );
}

function KeyValueCard({ title, items }: { title: string; items: [string, string | number][] }) {
  return (
    <div className="rounded-lg border border-gray-300 dark:border-neutral-700 p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="grid gap-1">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <span className="text-sm opacity-70">{k}</span>
            <code className="text-xs break-all">{String(v)}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MerchantPage() {
  const [merchantUrl, setMerchantUrl] = useState<string>(DEFAULTS.MERCHANT_URL);
  const [health, setHealth] = useState<{ ok: boolean; ts?: number } | null>(null);
  const [checking, setChecking] = useState(false);

  const configItems = useMemo(
    () => [
      ["Plasma RPC", DEFAULTS.PLASMA_RPC],
      ["Plasma Chain ID", DEFAULTS.PLASMA_CHAIN_ID],
      ["USDT0 Address", DEFAULTS.USDT0_ADDRESS],
      ["Merchant URL", merchantUrl],
    ] as [string, string | number][],
    [merchantUrl]
  );

  useEffect(() => {
    let aborted = false;
    async function check() {
      setChecking(true);
      try {
        const r = await fetch(`${merchantUrl.replace(/\/$/, "")}/health`, { cache: "no-store" });
        const j = await r.json();
        if (!aborted) setHealth({ ok: Boolean(j?.ok), ts: Number(j?.ts) || undefined });
      } catch {
        if (!aborted) setHealth({ ok: false });
      } finally {
        if (!aborted) setChecking(false);
      }
    }
    check();
    return () => {
      aborted = true;
    };
  }, [merchantUrl]);

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Merchant</h1>
      <div className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm opacity-80">Merchant URL</span>
          <input
            value={merchantUrl}
            onChange={(e) => setMerchantUrl(e.target.value)}
            className="border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent"
            placeholder="http://127.0.0.1:8000"
          />
        </label>
        <div className="flex items-center gap-3">
          <StatusLamp ok={Boolean(health?.ok)} message={checking ? "Checking..." : health?.ok ? "Merchant API reachable" : "Merchant offline"} />
          {health?.ts ? <span className="text-xs opacity-60">ts={health.ts}</span> : null}
        </div>
        <KeyValueCard title="Config" items={configItems} />
        <div>
          <a href="/client" className="inline-block rounded-md border px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800/30">
            Go to Client Demo →
          </a>
        </div>
      </div>
    </main>
  );
}


