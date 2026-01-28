"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, History, ExternalLink, Clock, Loader2, AlertCircle, RefreshCw, ChevronDown, Filter } from "lucide-react";
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
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");

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

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  if (loading) {
    return (
      <div className="clay-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-heading">
            <History className="w-5 h-5 text-plenmo-500" />
            Recent Activity
          </h2>
        </div>
        <TransactionListSkeleton count={3} />
      </div>
    );
  }

  // Error state
  if (error && transactions.length === 0) {
    return (
      <div className="clay-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-heading">
            <History className="w-5 h-5 text-plenmo-500" />
            Recent Activity
          </h2>
        </div>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button
            onClick={() => fetchHistory(0)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
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
      <div className="clay-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-heading">
            <History className="w-5 h-5 text-plenmo-500" />
            Recent Activity
          </h2>
        </div>
        <EmptyState
          icon={Clock}
          title="No transactions yet"
          description="Your payment history will appear here once you send or receive money"
        />
      </div>
    );
  }

  return (
    <div className="clay-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-heading">
          <History className="w-5 h-5 text-plenmo-500" />
          Recent Activity
        </h2>
        
        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
          {[
            { value: "all", label: "All" },
            { value: "sent", label: "Sent" },
            { value: "received", label: "Received" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as typeof filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === option.value
                  ? "bg-plenmo-500 text-black"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/40 text-sm">No {filter} transactions</p>
          </div>
        ) : (
          filteredTransactions.map((tx, index) => (
            <button
              key={tx.id}
              type="button"
              className="flex items-center gap-4 p-4 clay-list-item hover:bg-white/[0.06] transition-all duration-200 cursor-pointer group w-full text-left animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() =>
                window.open(`https://scan.plasma.to/tx/${tx.txHash}`, "_blank")
              }
              aria-label={`View ${tx.type === "sent" ? "sent" : "received"} transaction of $${tx.amount} ${tx.type === "sent" ? "to" : "from"} ${tx.counterparty}`}
            >
              <div className="relative">
                <Avatar name={tx.counterparty} size="lg" />
                <div
                  className={`absolute -bottom-0.5 -right-0.5 p-1.5 rounded-full shadow-lg ${
                    tx.type === "sent"
                      ? "bg-gradient-to-br from-red-400 to-red-500"
                      : "bg-gradient-to-br from-green-400 to-green-500"
                  }`}
                >
                  {tx.type === "sent" ? (
                    <ArrowUpRight className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate group-hover:text-white/90 transition-colors text-sm">
                  {tx.type === "sent" ? "Sent to" : "Received from"}{" "}
                  <span className="text-white/60">{tx.counterparty}</span>
                </div>
                <div className="text-white/40 text-xs flex items-center gap-2 mt-0.5">
                  <span>{formatRelativeTime(new Date(tx.timestamp * 1000))}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div
                className={`font-bold text-base ${
                  tx.type === "sent" ? "text-red-400" : "text-green-400"
                }`}
              >
                {tx.type === "sent" ? "-" : "+"}${tx.amount}
              </div>
            </button>
          ))
        )}

        {/* Load More Button */}
        {hasMore && filter === "all" && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full mt-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/5 hover:border-white/10"
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
        {filteredTransactions.length > 0 && (
          <p className="text-center text-white/30 text-xs mt-4 pt-2 border-t border-white/5">
            Showing {filteredTransactions.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
