"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, History, ExternalLink, Clock } from "lucide-react";
import type { Address } from "viem";
import { TransactionListSkeleton } from "./ui/Skeleton";
import { EmptyState } from "./ui/EmptyState";
import { Avatar } from "./ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";

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
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-[rgb(0,212,255)]" />
          Recent Activity
        </h2>
        <TransactionListSkeleton count={3} />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="liquid-glass rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-[rgb(0,212,255)]" />
          Recent Activity
        </h2>
        <EmptyState
          icon={Clock}
          title="No transactions yet"
          description="Your payment history will appear here once you send or receive money"
        />
      </div>
    );
  }

  return (
    <div className="liquid-glass rounded-3xl p-6 md:p-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-[rgb(0,212,255)]" />
        Recent Activity
      </h2>
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-4 p-4 liquid-glass-subtle rounded-2xl hover:bg-white/[0.08] transition-all duration-200 cursor-pointer group"
            onClick={() =>
              window.open(`https://scan.plasma.to/tx/${tx.txHash}`, "_blank")
            }
          >
            <div className="relative">
              <Avatar name={tx.counterparty} size="lg" />
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-full ${
                  tx.type === "sent"
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
              >
                {tx.type === "sent" ? (
                  <ArrowUpRight className="w-3 h-3 text-white" />
                ) : (
                  <ArrowDownLeft className="w-3 h-3 text-white" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-white truncate group-hover:text-white/90 transition-colors">
                {tx.type === "sent" ? "Sent to" : "Received from"}{" "}
                <span className="text-white/70">{tx.counterparty}</span>
              </div>
              <div className="text-white/40 text-sm flex items-center gap-2">
                <span>{formatRelativeTime(new Date(tx.timestamp * 1000))}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div
              className={`font-semibold text-lg ${
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
