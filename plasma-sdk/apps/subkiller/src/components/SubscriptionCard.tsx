'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ExternalLink, XCircle, Mail, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Subscription } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  streaming: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  software: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  gaming: 'bg-green-500/20 text-green-400 border-green-500/30',
  news: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  fitness: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  food: 'bg-red-500/20 text-red-400 border-red-500/30',
  shopping: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  finance: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  education: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  social: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  productivity: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const CATEGORY_ICONS: Record<string, string> = {
  streaming: '🎬',
  software: '💻',
  gaming: '🎮',
  news: '📰',
  fitness: '💪',
  food: '🍕',
  shopping: '🛒',
  finance: '💰',
  education: '📚',
  social: '👥',
  productivity: '📊',
  other: '📦',
};

interface SubscriptionCardProps {
  subscription: Subscription;
  onCancel?: (subscription: Subscription) => void;
  isSelected?: boolean;
  onSelect?: (subscription: Subscription) => void;
}

export function SubscriptionCard({ subscription, onCancel, isSelected, onSelect }: SubscriptionCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const costDisplay = subscription.estimatedCost > 0 
    ? `$${subscription.estimatedCost.toFixed(2)}/${subscription.frequency === 'yearly' ? 'yr' : 'mo'}`
    : 'Free / Unknown';

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel?.(subscription);
    setShowConfirm(false);
  };

  const handleCancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <>
      <div
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={() => onSelect?.(subscription)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect?.(subscription)}
        className={cn(
          'glass-card p-5 relative overflow-hidden cursor-default',
          onSelect && 'cursor-pointer',
          isSelected && 'ring-2 ring-brand-500 border-brand-500/50'
        )}
      >
        {/* Status indicator stripe */}
        {subscription.status === 'cancelling' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500 animate-pulse" />
        )}
        {subscription.status === 'cancelled' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
        )}

        <div className="flex items-start gap-4">
          {/* Logo/Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl glass-subtle flex items-center justify-center text-2xl border border-white/5">
            {subscription.logoUrl ? (
              <Image 
                src={subscription.logoUrl} 
                alt={subscription.name} 
                width={36}
                height={36}
                className="w-9 h-9 rounded-lg"
                unoptimized
              />
            ) : (
              CATEGORY_ICONS[subscription.category] || '📦'
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h3 className="font-heading font-semibold text-white truncate text-lg">
                {subscription.name}
              </h3>
              <span className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-medium border',
                CATEGORY_COLORS[subscription.category] || CATEGORY_COLORS.other
              )}>
                {subscription.category}
              </span>
            </div>

            <p className="text-sm text-white/50 truncate mb-3">{subscription.email}</p>

            <div className="flex items-center gap-4 text-sm text-white/40">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {subscription.emailCount} emails
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(subscription.lastSeen).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Cost & Actions */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-1 text-xl font-bold font-heading text-white mb-3">
              <DollarSign className="w-5 h-5 text-brand-400" />
              <span>{costDisplay}</span>
            </div>

            <div className="flex gap-2 justify-end">
              {subscription.unsubscribeUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(subscription.unsubscribeUrl, '_blank');
                  }}
                  className="glass-btn-secondary px-3 py-2 text-sm rounded-xl touch-target flex items-center gap-1.5 min-h-[40px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Manage
                </button>
              )}
              {onCancel && subscription.status === 'active' && (
                <button
                  onClick={handleCancelClick}
                  className="glass-btn-danger px-3 py-2 text-sm rounded-xl touch-target flex items-center gap-1.5 min-h-[40px]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
              {subscription.status === 'cancelled' && (
                <span className="glass-badge-success text-sm">
                  Cancelled
                </span>
              )}
              {subscription.status === 'cancelling' && (
                <span className="glass-badge text-yellow-400 text-sm">
                  Cancelling...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="dialog-overlay" onClick={handleCancelConfirm}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-white text-lg">
                  Cancel Subscription?
                </h3>
                <p className="text-sm text-white/50">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-white/70 mb-6">
              Are you sure you want to cancel your <span className="font-semibold text-white">{subscription.name}</span> subscription? 
              This will save you <span className="font-semibold text-brand-400">{costDisplay}</span>.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelConfirm}
                className="glass-btn-secondary px-5 py-2.5 rounded-xl touch-target"
              >
                Keep It
              </button>
              <button
                onClick={handleConfirmCancel}
                className="glass-btn px-5 py-2.5 rounded-xl touch-target"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Compact card variant for grid layouts
export function SubscriptionCardCompact({ subscription, onCancel }: SubscriptionCardProps) {
  const costDisplay = subscription.estimatedCost > 0 
    ? `$${subscription.estimatedCost.toFixed(2)}`
    : '—';

  return (
    <div className="glass-card p-4 relative overflow-hidden">
      {subscription.status === 'cancelled' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl glass-subtle flex items-center justify-center text-lg">
          {subscription.logoUrl ? (
            <Image 
              src={subscription.logoUrl} 
              alt={subscription.name} 
              width={24}
              height={24}
              className="w-6 h-6 rounded"
              unoptimized
            />
          ) : (
            CATEGORY_ICONS[subscription.category] || '📦'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-heading font-medium text-white truncate">{subscription.name}</h4>
          <p className="text-xs text-white/40 truncate">{subscription.frequency}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold font-heading text-brand-400">{costDisplay}</span>
        {onCancel && subscription.status === 'active' && (
          <button
            onClick={() => onCancel(subscription)}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
