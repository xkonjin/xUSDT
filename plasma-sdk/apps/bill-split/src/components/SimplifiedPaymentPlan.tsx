'use client';

/**
 * SimplifiedPaymentPlan Component
 * 
 * Displays a simplified payment plan that minimizes the number of transactions.
 * Shows savings compared to original payment count.
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2,
  Copy,
  ExternalLink,
  X
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface SimplifiedPayment {
  from: string;
  to: string;
  amount: number;
}

interface SimplificationResult {
  simplifiedPayments: SimplifiedPayment[];
  originalCount: number;
  simplifiedCount: number;
  savingsCount: number;
  savingsMessage: string;
}

interface SimplifiedPaymentPlanProps {
  address: string;
  email?: string;
  onClose?: () => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// =============================================================================
// Component
// =============================================================================

export function SimplifiedPaymentPlan({ 
  address, 
  email, 
  onClose,
  className 
}: SimplifiedPaymentPlanProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SimplificationResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchSimplified() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ address });
        if (email) params.append('email', email);

        const response = await fetch(`/api/simplify?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to load simplified payments');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError('Failed to load simplified payments');
      } finally {
        setLoading(false);
      }
    }

    fetchSimplified();
  }, [address, email]);

  const handleCopyPaymentLink = async (payment: SimplifiedPayment, index: number) => {
    // Create a simple payment link (would integrate with actual payment system)
    const paymentLink = `${window.location.origin}/pay?to=${encodeURIComponent(payment.to)}&amount=${payment.amount}`;
    
    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        data-testid="simplified-loading"
        className={cn(
          'flex flex-col items-center justify-center p-8',
          className
        )}
      >
        <Loader2 className="w-8 h-8 text-[rgb(0,212,255)] animate-spin mb-3" />
        <p className="text-white/50 text-sm">Calculating optimal payments...</p>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div
        data-testid="simplified-error"
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-white/60">{error || 'Failed to load simplified payments'}</p>
      </div>
    );
  }

  // Empty state
  if (data.simplifiedPayments.length === 0) {
    return (
      <div
        data-testid="simplified-empty"
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
        <p className="text-white font-medium">All settled up!</p>
        <p className="text-white/40 text-sm mt-1">No payments needed</p>
      </div>
    );
  }

  const { simplifiedPayments, originalCount, simplifiedCount, savingsCount, savingsMessage } = data;
  const hasSavings = savingsCount > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with close button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[rgb(0,212,255)]" />
          <h3 className="text-white font-semibold">Simplified Payments</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        )}
      </div>

      {/* Savings badge */}
      {hasSavings && (
        <div 
          data-testid="savings-badge"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20"
        >
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-green-400 text-sm">
            {savingsMessage} — <span className="font-medium">Save {savingsCount} transaction{savingsCount !== 1 ? 's' : ''}!</span>
          </p>
        </div>
      )}

      {/* Payment list */}
      <div className="space-y-3">
        {simplifiedPayments.map((payment, index) => (
          <div
            key={index}
            data-testid="payment-card"
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              {/* From → To */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-white text-sm font-medium">
                    {payment.from.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white/70 text-sm truncate max-w-[80px]">
                    {payment.from === 'You' ? 'You' : payment.from}
                  </span>
                </div>
                
                <ArrowRight className="w-4 h-4 text-white/30" />
                
                <div className="flex items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-white text-sm font-medium">
                    {payment.to.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white/70 text-sm truncate max-w-[80px]">
                    {payment.to === 'You' ? 'You' : payment.to}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <span className="text-white font-bold text-lg">
                {formatCurrency(payment.amount)}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCopyPaymentLink(payment, index)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                  copiedIndex === index
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                )}
              >
                {copiedIndex === index ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
              
              {payment.to !== 'You' && (
                <button
                  className="py-2 px-3 rounded-lg bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] text-sm font-medium hover:bg-[rgb(0,212,255)]/30 transition-colors flex items-center gap-1"
                >
                  Pay Now
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Original payments</span>
          <span className="text-white/70">{originalCount}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-white/50">Simplified to</span>
          <span className="text-[rgb(0,212,255)] font-medium">{simplifiedCount}</span>
        </div>
      </div>
    </div>
  );
}
