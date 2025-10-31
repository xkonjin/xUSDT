"use client";
import React, { useEffect, useState } from "react";

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Array<{ toyId: number; owner: string; price: number; tokenId: string }>>([]);
  useEffect(() => { (async () => { const r = await fetch("/api/leaderboard", { cache: "no-store" }); const d = await r.json(); setLeaders(d.leaders || []); })(); }, []);
  return (
    <div className="px-16 py-8 space-y-8">
      <h1 className="text-5xl font-light tracking-tight text-neutral-200">Leaderboard</h1>
      <div className="space-y-3">
        {leaders.length === 0 && <div className="text-neutral-400">No leaders yet.</div>}
        {leaders.map((l) => (
          <div key={l.toyId} className="bg-neutral-800/30 border border-neutral-700 rounded-lg p-4 flex items-center justify-between">
            <div className="text-neutral-300">Toy #{l.toyId}</div>
            <div className="text-emerald-400">{l.price.toFixed(6)} USDT0</div>
            <div className="text-neutral-500 text-sm">Owner: {l.owner.slice(0,6)}…{l.owner.slice(-4)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
