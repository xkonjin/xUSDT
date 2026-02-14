'use client';

/**
 * BalanceDashboard Component
 * 
 * Displays user's balance summary across all bills.
 * Shows net balance and per-person breakdown.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { ArrowUp, ArrowDown, Loader2, AlertCircle, Wallet, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SimplifiedPaymentPlan } from './SimplifiedPaymentPlan';

// =============================================================================
// Types
// =============================================================================

interface PersonBalance {
  name: string;
  email?: string | null;
  address?: string;
  amount: number;
  direction: 'owes_me' | 'i_owe';
  bills: string[];
}

interface BalanceSummary {
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  balances: PersonBalance[];
}

interface BalanceDashboardProps {
  address: string;
  email?: string;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}

// =============================================================================
// Component
// =============================================================================

export function BalanceDashboard({ address, email, compact = false, className }: BalanceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceSummary | null>(null);
  const [showSimplified, setShowSimplified] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ address });
        if (email) params.append('email', email);

        const response = await fetch(`/api/balance?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to load balances');
        }

        const data = await response.json();
        setBalanceData(data);
      } catch {
        setError('Failed to load balances');
      } finally {
        setLoading(false);
      }
    }

    fetchBalances();
  }, [address, email]);

  // Loading state
  if (loading) {
    return (
      <div
        data-testid="balance-loading"
        className={cn(
          'flex items-center justify-center p-8',
          className
        )}
      >
        <Loader2 className="w-8 h-8 text-[rgb(0,212,255)] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !balanceData) {
    return (
      <div
        data-testid="balance-error"
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-white/60">{error || 'Failed to load balances'}</p>
      </div>
    );
  }

  // Empty state - no outstanding balances
  if (balanceData.balances.length === 0) {
    return (
      <div
        data-testid="balance-empty"
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <Wallet className="w-12 h-12 text-white/20 mb-3" />
        <p className="text-white/40">All settled up! 🎉</p>
        <p className="text-white/20 text-sm mt-1">No outstanding balances</p>
      </div>
    );
  }

  const { netBalance, balances } = balanceData;
  const isPositive = netBalance >= 0;

  // Compact mode for home page
  if (compact) {
    return (
      <div
        data-testid="balance-compact"
        className={cn('space-y-3', className)}
      >
        {/* Net balance */}
        <div className="flex items-center justify-between">
          <span className="text-white/50 text-sm">Net Balance</span>
          <span
            data-testid="net-balance"
            className={cn(
              'text-xl font-bold',
              isPositive ? 'text-green-400' : 'text-red-400'
            )}
          >
            {isPositive ? '+' : '-'}{formatCurrency(netBalance)}
          </span>
        </div>

        {/* Top 2 balances preview */}
        <div className="space-y-2">
          {balances.slice(0, 2).map((balance, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-white/70">{balance.name}</span>
              <span className={cn(
                balance.direction === 'owes_me' ? 'text-green-400' : 'text-red-400'
              )}>
                {balance.direction === 'owes_me' ? '+' : '-'}{formatCurrency(balance.amount)}
              </span>
            </div>
          ))}
          {balances.length > 2 && (
            <p className="text-white/30 text-xs text-center">
              +{balances.length - 2} more
            </p>
          )}
        </div>
      </div>
    );
  }

  // Full dashboard view
  const owesMe = balances.filter(b => b.direction === 'owes_me');
  const iOwe = balances.filter(b => b.direction === 'i_owe');
  const hasMultipleBalances = balances.length >= 2;

  // Show simplified payment plan
  if (showSimplified) {
    return (
      <div className={cn('space-y-4', className)}>
        <SimplifiedPaymentPlan
          address={address}
          email={email}
          onClose={() => setShowSimplified(false)}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Net Balance Card */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-white/50 text-sm mb-2">Net Balance</p>
        <div
          data-testid="net-balance"
          className={cn(
            'text-4xl font-bold',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}
        >
          {isPositive ? '+' : '-'}{formatCurrency(netBalance)}
        </div>
        <p className="text-white/30 text-sm mt-2">
          {isPositive 
            ? 'Others owe you this amount'
            : 'You owe this amount to others'
          }
        </p>
        
        {/* Simplify Debts Button - shown when multiple balances */}
        {hasMultipleBalances && (
          <button
            onClick={() => setShowSimplified(true)}
            data-testid="simplify-debts-button"
            className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[rgb(0,212,255)]/20 to-purple-500/20 border border-[rgb(0,212,255)]/30 text-white font-medium flex items-center justify-center gap-2 hover:from-[rgb(0,212,255)]/30 hover:to-purple-500/30 transition-all"
          >
            <Sparkles className="w-4 h-4 text-[rgb(0,212,255)]" />
            Simplify Debts
          </button>
        )}
      </div>

      {/* People who owe you */}
      {owesMe.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white/50 text-sm font-medium flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-green-400" />
            Owed to You
          </h3>
          <div className="space-y-2">
            {owesMe.map((balance, index) => (
              <PersonBalanceCard
                key={index}
                balance={balance}
                showSettle
              />
            ))}
          </div>
        </div>
      )}

      {/* People you owe */}
      {iOwe.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white/50 text-sm font-medium flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-red-400" />
            You Owe
          </h3>
          <div className="space-y-2">
            {iOwe.map((balance, index) => (
              <PersonBalanceCard
                key={index}
                balance={balance}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface PersonBalanceCardProps {
  balance: PersonBalance;
  showSettle?: boolean;
}

function PersonBalanceCard({ balance, showSettle = false }: PersonBalanceCardProps) {
  const isOwesMe = balance.direction === 'owes_me';

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white font-medium',
          isOwesMe ? 'bg-green-500/20' : 'bg-red-500/20'
        )}>
          {balance.name.charAt(0).toUpperCase()}
        </div>
        
        {/* Name and status */}
        <div>
          <p className="text-white font-medium">{balance.name}</p>
          <p className={cn(
            'text-sm',
            isOwesMe ? 'text-green-400' : 'text-red-400'
          )}>
            {isOwesMe 
              ? `owes you ${formatCurrency(balance.amount)}`
              : `you owe ${formatCurrency(balance.amount)}`
            }
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {showSettle && (
          <button
            data-testid="settle-button"
            className="px-3 py-1.5 rounded-lg bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] text-sm font-medium hover:bg-[rgb(0,212,255)]/30 transition-colors flex items-center gap-1"
          >
            Remind
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        
        {balance.bills.length === 1 && (
          <Link
            href={`/bill/${balance.bills[0]}`}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
