"use client";

import { memo } from 'react';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  from: string;
  to: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

/**
 * Memoized transaction history component
 * Only re-renders when transactions changes
 */
export const TransactionHistory = memo(function TransactionHistory({
  transactions,
}: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="clay-card p-8 text-center">
        <p className="text-white/60">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="clay-transaction"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                tx.type === 'send' ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                {tx.type === 'send' ? '↑' : '↓'}
              </div>
              <div>
                <p className="font-medium text-white">
                  {tx.type === 'send' ? 'Sent' : 'Received'}
                </p>
                <p className="text-sm text-white/60">
                  {tx.type === 'send' 
                    ? `To ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`
                    : `From ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${
                tx.type === 'send' ? 'text-red-400' : 'text-green-400'
              }`}>
                {tx.type === 'send' ? '-' : '+'}{tx.amount} USDT0
              </p>
              <p className="text-xs text-white/60">
                {new Date(tx.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
          {tx.status === 'pending' && (
            <div className="mt-2 text-xs text-yellow-400">Pending...</div>
          )}
          {tx.status === 'failed' && (
            <div className="mt-2 text-xs text-red-400">Failed</div>
          )}
        </div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.address === nextProps.address &&
    prevProps.transactions.length === nextProps.transactions.length &&
    prevProps.transactions[0]?.id === nextProps.transactions[0]?.id
  );
});

export default TransactionHistory;
