'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Address } from 'viem';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
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
        console.error('Failed to fetch transaction history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [address]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <p className="text-gray-500 text-center py-8">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-4 p-4 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={() => window.open(`https://scan.plasma.to/tx/${tx.txHash}`, '_blank')}
          >
            <div className={`p-2 rounded-full ${
              tx.type === 'sent' ? 'bg-red-900/30' : 'bg-green-900/30'
            }`}>
              {tx.type === 'sent' ? (
                <ArrowUpRight className="w-5 h-5 text-red-400" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 text-green-400" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {tx.type === 'sent' ? 'Sent to' : 'Received from'} {tx.counterparty}
              </div>
              <div className="text-gray-500 text-sm">
                {new Date(tx.timestamp * 1000).toLocaleDateString()}
              </div>
            </div>
            
            <div className={`font-semibold ${
              tx.type === 'sent' ? 'text-red-400' : 'text-green-400'
            }`}>
              {tx.type === 'sent' ? '-' : '+'}${tx.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
