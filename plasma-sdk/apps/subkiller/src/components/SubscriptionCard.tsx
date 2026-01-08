'use client';

import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { ExternalLink, XCircle, Mail, Calendar, DollarSign } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Subscription } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  streaming: 'bg-purple-500/20 text-purple-400',
  software: 'bg-blue-500/20 text-blue-400',
  gaming: 'bg-green-500/20 text-green-400',
  news: 'bg-yellow-500/20 text-yellow-400',
  fitness: 'bg-orange-500/20 text-orange-400',
  food: 'bg-red-500/20 text-red-400',
  shopping: 'bg-pink-500/20 text-pink-400',
  finance: 'bg-emerald-500/20 text-emerald-400',
  education: 'bg-indigo-500/20 text-indigo-400',
  social: 'bg-cyan-500/20 text-cyan-400',
  productivity: 'bg-amber-500/20 text-amber-400',
  other: 'bg-gray-500/20 text-gray-400',
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
  const costDisplay = subscription.estimatedCost > 0 
    ? `$${subscription.estimatedCost.toFixed(2)}/${subscription.frequency === 'yearly' ? 'yr' : 'mo'}`
    : 'Free / Unknown';

  return (
    <Card
      variant={onSelect ? 'interactive' : 'default'}
      className={cn(
        'relative overflow-hidden',
        isSelected && 'ring-2 ring-plasma-500 border-plasma-500'
      )}
      onClick={() => onSelect?.(subscription)}
    >
      {/* Status indicator */}
      {subscription.status === 'cancelling' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500 animate-pulse" />
      )}
      {subscription.status === 'cancelled' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
      )}

      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo/Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl">
            {subscription.logoUrl ? (
              <img 
                src={subscription.logoUrl} 
                alt={subscription.name} 
                className="w-8 h-8 rounded"
              />
            ) : (
              CATEGORY_ICONS[subscription.category] || '📦'
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white truncate">{subscription.name}</h3>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                CATEGORY_COLORS[subscription.category] || CATEGORY_COLORS.other
              )}>
                {subscription.category}
              </span>
            </div>

            <p className="text-sm text-gray-400 truncate mb-2">{subscription.email}</p>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {subscription.emailCount} emails
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(subscription.lastSeen).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Cost & Actions */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-1 text-lg font-bold text-white mb-2">
              <DollarSign className="w-4 h-4 text-plasma-400" />
              {costDisplay}
            </div>

            <div className="flex gap-2">
              {subscription.unsubscribeUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(subscription.unsubscribeUrl, '_blank');
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Manage
                </Button>
              )}
              {onCancel && subscription.status === 'active' && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(subscription);
                  }}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
