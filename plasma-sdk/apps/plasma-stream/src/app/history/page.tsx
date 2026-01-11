"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: string;
  type: "create" | "withdraw" | "cancel";
  streamId: string;
  amount: number;
  recipient?: string;
  sender?: string;
  timestamp: string;
  txHash?: string;
  status: "completed" | "pending" | "failed";
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "create",
    streamId: "stream-1",
    amount: 1000,
    recipient: "0x1234...5678",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    txHash: "0xabc...def",
    status: "completed",
  },
  {
    id: "2",
    type: "withdraw",
    streamId: "stream-1",
    amount: 250,
    sender: "0x1234...5678",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    txHash: "0xghi...jkl",
    status: "completed",
  },
];

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [filter, setFilter] = useState<"all" | "create" | "withdraw" | "cancel">("all");

  const filtered = filter === "all" 
    ? transactions 
    : transactions.filter(t => t.type === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300">
            Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "create", "withdraw", "cancel"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === f
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filtered.map((tx, i) => (
            <div
              key={tx.id}
              className="p-4 bg-white/5 rounded-xl border border-white/10 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    tx.type === "create" ? "bg-green-500/20" :
                    tx.type === "withdraw" ? "bg-cyan-500/20" : "bg-red-500/20"
                  }`}>
                    {tx.type === "create" ? (
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                    ) : tx.type === "withdraw" ? (
                      <ArrowDownLeft className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium capitalize">{tx.type} Stream</p>
                    <p className="text-sm text-white/40">
                      {tx.recipient ? `To: ${tx.recipient}` : tx.sender ? `From: ${tx.sender}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    tx.type === "withdraw" ? "text-green-400" : "text-white"
                  }`}>
                    {tx.type === "withdraw" ? "+" : tx.type === "cancel" ? "" : "-"}
                    ${tx.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40">
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {tx.txHash && (
                <a
                  href={`https://explorer.plasma.to/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  View on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
