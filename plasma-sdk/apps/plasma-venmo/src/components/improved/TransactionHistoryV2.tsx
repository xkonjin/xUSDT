
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  ExternalLink, 
  Clock, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown 
} from "lucide-react";
import type { Address } from "viem";
import { TransactionListSkeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Avatar } from "../ui/Avatar";
import { formatRelativeTime } from "@/lib/utils";

const PAGE_SIZE = 15;

// Improved TypeScript Type for a more robust data model
interface Transaction {
  id: string;
  type: "sent" | "received";
  amount: {
    value: string;
    currency: string; // e.g., 'USD'
  };
  counterparty: {
    name: string;
    avatarUrl?: string; // Optional avatar URL for better UI
  };
  timestamp: number; // UNIX timestamp
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}

interface TransactionHistoryProps {
  address: Address | undefined;
}

// A more specific and descriptive component name
export function DetailedTransactionHistory({ address }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Using useCallback to memoize the fetch function and prevent re-creation on re-renders
  const fetchHistory = useCallback(async (pageNum: number, append = false) => {
    if (!address) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const offset = pageNum * PAGE_SIZE;
      // Using URLSearchParams for safer query parameter handling
      const params = new URLSearchParams({
        address,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      const response = await fetch(`/api/history?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to load transactions");
      }

      const data = await response.json();
      const newTxs: Transaction[] = data.transactions || [];
      
      setTransactions(prev => append ? [...prev, ...newTxs] : newTxs);
      setHasMore(newTxs.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      if (!append) setTransactions([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [address]); // Dependency array includes address

  useEffect(() => {
    fetchHistory(0);
  }, [fetchHistory]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchHistory(page + 1, true);
    }
  };

  // Memoizing the header to prevent re-renders
  const header = useMemo(() => (
    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" id="transaction-history-heading">
      <History className="w-5 h-5 text-plenmo-500" />
      Recent Activity
    </h2>
  ), []);

  // Loading state with improved accessibility
  if (isLoading) {
    return (
      <div className="clay-card p-6 md:p-8" role="region" aria-labelledby="transaction-history-heading" aria-busy="true">
        {header}
        <TransactionListSkeleton count={5} />
      </div>
    );
  }

  // Comprehensive error state with a clear call to action
  if (error && transactions.length === 0) {
    return (
      <div className="clay-card p-6 md:p-8" role="alert">
        {header}
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="font-semibold text-red-300">Oops! Something went wrong.</p>
          <p className="text-red-400 text-sm max-w-xs">{error}</p>
          <button
            onClick={() => fetchHistory(0)}
            className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-plenmo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state with clearer messaging
  if (transactions.length === 0) {
    return (
      <div className="clay-card p-6 md:p-8">
        {header}
        <EmptyState
          icon={Clock}
          title="No Transaction History"
          description="Once you send or receive funds, your transaction history will be displayed here."
        />
      </div>
    );
  }

  return (
    <div className="clay-card p-6 md:p-8" role="region" aria-labelledby="transaction-history-heading">
      {header}
      <ul className="space-y-3">
        {transactions.map((tx, index) => (
          <li key={`${tx.id}-${index}`}>
            <a
              href={`https://scan.plasma.to/tx/${tx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 clay-list-item hover:bg-white/[0.08] transition-all duration-200 group w-full text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-plenmo-500"
              aria-label={`View transaction of ${tx.amount.value} ${tx.amount.currency} ${tx.type === "sent" ? "to" : "from"} ${tx.counterparty.name} on ${new Date(tx.timestamp * 1000).toLocaleDateString()}`}
            >
              <div className="relative flex-shrink-0">
                <Avatar name={tx.counterparty.name} src={tx.counterparty.avatarUrl} size="lg" />
                <div
                  className={`absolute -bottom-1 -right-1 p-1 rounded-full flex items-center justify-center shadow-md ${tx.type === "sent" ? "bg-red-500" : "bg-green-500"}`}
                  aria-hidden="true"
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
                  <span className="text-white/80 font-normal">{tx.counterparty.name}</span>
                </div>
                <div className="text-white/50 text-sm flex items-center gap-2 mt-1">
                  <span>{formatRelativeTime(new Date(tx.timestamp * 1000))}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className={`font-semibold text-lg text-right ${tx.type === "sent" ? "text-red-400" : "text-green-400"}`}>
                {tx.type === "sent" ? "-" : "+"}${tx.amount.value} <span className="text-xs text-white/60">{tx.amount.currency}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="w-full mt-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-plenmo-500"
          aria-busy={isLoadingMore}
        >
          {isLoadingMore ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading More...
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Load More
            </>
          )}
        </button>
      )}

      {transactions.length > 0 && (
        <p className="text-center text-white/40 text-xs mt-4" aria-live="polite">
          Showing {transactions.length} of many transactions.
        </p>
      )}
    </div>
  );
}
