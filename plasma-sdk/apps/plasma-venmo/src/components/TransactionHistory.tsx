"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { Address } from "viem";

interface Transaction {
  id: string;
  type: "sent" | "received";
  amount: string;
  counterparty: string;
  timestamp: number;
  txHash: string;
}

interface TransactionHistoryProps {
  address: Address | undefined;
}

export function TransactionHistory({ address }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    async function fetchHistory() {
      setLoading(true);
      try {
        const response = await fetch(`/api/history?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions || []);
        }
      } catch {
        // Silent fail - empty transaction list will be shown
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [address]);

  if (loading) {
    return (
      <div className="liquid-glass rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 liquid-glass-subtle rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="liquid-glass rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full liquid-glass-subtle flex items-center justify-center">
            <ArrowUpRight className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/40">No transactions yet</p>
          <p className="text-white/20 text-sm mt-1">
            Send your first payment above
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="liquid-glass rounded-3xl p-6 md:p-8">
      <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-4 p-4 liquid-glass-subtle rounded-2xl hover:bg-white/[0.08] transition-all duration-200 cursor-pointer group"
            onClick={() =>
              window.open(`https://scan.plasma.to/tx/${tx.txHash}`, "_blank")
            }
          >
            <div
              className={`p-2.5 rounded-xl ${
                tx.type === "sent"
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-green-500/10 border border-green-500/20"
              }`}
            >
              {tx.type === "sent" ? (
                <ArrowUpRight className="w-5 h-5 text-red-400" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 text-green-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-white truncate group-hover:text-white/90 transition-colors">
                {tx.type === "sent" ? "Sent to" : "Received from"}{" "}
                {tx.counterparty}
              </div>
              <div className="text-white/40 text-sm">
                {new Date(tx.timestamp * 1000).toLocaleDateString()}
              </div>
            </div>

            <div
              className={`font-semibold ${
                tx.type === "sent" ? "text-red-400" : "text-green-400"
              }`}
            >
              {tx.type === "sent" ? "-" : "+"}${tx.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
