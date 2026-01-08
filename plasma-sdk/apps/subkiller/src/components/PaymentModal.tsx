'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { X, Wallet, Zap, Shield } from 'lucide-react';
import { SUBKILLER_PRICE_DISPLAY } from '@/lib/payment';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayWithWallet: () => Promise<void>;
  subscriptionCount: number;
  estimatedSavings: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  onPayWithWallet,
  subscriptionCount,
  estimatedSavings,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePay = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onPayWithWallet();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md animate-in fade-in zoom-in duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Unlock SubKiller</h2>
            <p className="text-sm text-gray-400">One-time payment, unlimited scans</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Subscriptions found</span>
              <span className="text-white font-medium">{subscriptionCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Potential monthly savings</span>
              <span className="text-green-400 font-medium">
                ${estimatedSavings.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between">
              <span className="text-gray-400">SubKiller price</span>
              <span className="text-white font-bold text-lg">{SUBKILLER_PRICE_DISPLAY}</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-plasma-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-plasma-400" />
              </div>
              <div>
                <p className="text-white font-medium">Gasless Payment</p>
                <p className="text-sm text-gray-400">No gas fees on Plasma chain</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-plasma-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-plasma-400" />
              </div>
              <div>
                <p className="text-white font-medium">One-time Purchase</p>
                <p className="text-sm text-gray-400">No recurring charges, ever</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Pay Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePay}
            loading={isLoading}
          >
            <Wallet className="w-5 h-5 mr-2" />
            Pay {SUBKILLER_PRICE_DISPLAY} with USDT0
          </Button>

          <p className="text-xs text-center text-gray-500">
            Powered by Plasma Chain - Zero gas fees
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
