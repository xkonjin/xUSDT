"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, History, ExternalLink, Clock, Loader2, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import type { Address } from "viem";
import { TransactionListSkeleton } from "./ui/Skeleton";
import { EmptyState } from "./ui/EmptyState";
import { Avatar } from "./ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";

const PAGE_SIZE = 10;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchHistory = async (pageNum: number, append = false) => {
    if (!address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const offset = pageNum * PAGE_SIZE;
      const response = await fetch(`/api/history?address=${address}&limit=${PAGE_SIZE}&offset=${offset}`);
      if (!response.ok) {
        throw new Error("Failed to load transactions");
      }
      const data = await response.json();
      const newTxs = data.transactions || [];
      
      if (append) {
        setTransactions(prev => [...prev, ...newTxs]);
      } else {
        setTransactions(newTxs);
      }
      
      setHasMore(newTxs.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transactions");
      if (!append) setTransactions([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchHistory(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHistory(page + 1, true);
    }
  };

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

  // Error state
  if (error && transactions.length === 0) {
    return (
      <div className="liquid-glass rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-[rgb(0,212,255)]" />
          Recent Activity
        </h2>
        <div className="flex flex-col items-center gap-3 py-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchHistory(0)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
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

        {/* Load More Button */}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full mt-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Load More
              </>
            )}
          </button>
        )}

        {/* Total count */}
        {transactions.length > 0 && (
          <p className="text-center text-white/30 text-xs mt-3">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
