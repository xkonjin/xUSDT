/**
 * Payment Modal Component
 * 
 * Handles the SubKiller one-time payment flow using gasless USDT0 transfers.
 * Uses EIP-3009 transferWithAuthorization for zero-gas-fee payments on Plasma chain.
 * 
 * Flow:
 * 1. User clicks "Pay" button
 * 2. If not connected, prompts wallet connection via Privy
 * 3. Signs EIP-712 typed data for transfer authorization
 * 4. Submits to backend API for gasless execution
 * 5. On success, unlocks full SubKiller features
 */

'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { ConfirmModal } from '@plasma-pay/ui';
import { X, Wallet, Zap, Shield, AlertCircle } from 'lucide-react';
import { 
  SUBKILLER_PRICE_DISPLAY, 
  SUBKILLER_PRICE,
  createPaymentTypedData,
} from '@/lib/payment';
import type { PlasmaEmbeddedWallet } from '@plasma-pay/privy-auth';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (txHash: string) => void;
  subscriptionCount: number;
  estimatedSavings: number;
  // Wallet props from Privy
  wallet: PlasmaEmbeddedWallet | null;
  isWalletConnected: boolean;
  connectWallet: () => void;
}

/**
 * Helper function to split an EIP-712 signature into v, r, s components
 * Required for transferWithAuthorization contract call
 */
function splitSignature(signature: string): { v: number; r: string; s: string } {
  const sig = signature.startsWith('0x') ? signature.slice(2) : signature;
  const r = '0x' + sig.slice(0, 64);
  const s = '0x' + sig.slice(64, 128);
  let v = parseInt(sig.slice(128, 130), 16);
  // Normalize v to 27 or 28 if needed
  if (v < 27) v += 27;
  return { v, r, s };
}

export function PaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  subscriptionCount,
  estimatedSavings,
  wallet,
  isWalletConnected,
  connectWallet,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'ready' | 'signing' | 'submitting'>('ready');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  if (!isOpen) return null;

  /**
   * Handle close attempt - show confirmation if payment is in progress
   */
  const handleCloseAttempt = () => {
    if (isLoading) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  /**
   * Handle confirmed close during active payment
   */
  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    setIsLoading(false);
    setStep('ready');
    onClose();
  };

  /**
   * Handle the full payment flow:
   * 1. Create typed data for EIP-712 signature
   * 2. Request user signature via wallet
   * 3. Submit to API for gasless execution
   * 4. Handle success/failure
   */
  const handlePay = async () => {
    // Ensure wallet is connected
    if (!wallet) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('signing');

    try {
      // Step 1: Create EIP-712 typed data for the transfer authorization
      const typedData = createPaymentTypedData(wallet.address);

      // Step 2: Request signature from user's wallet
      // This shows a popup asking user to approve the $0.99 payment
      const signature = await wallet.signTypedData(typedData);
      
      setStep('submitting');

      // Step 3: Submit signed authorization to backend for gasless execution
      const response = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: wallet.address,
          signature: splitSignature(signature),
          typedData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Step 4: Payment successful - notify parent component
      onPaymentSuccess(result.txHash);
      onClose();
    } catch (err) {
      // Handle user rejection vs other errors
      if (err instanceof Error) {
        if (err.message.includes('rejected') || err.message.includes('denied')) {
          setError('Payment was cancelled');
        } else {
          setError(err.message);
        }
      } else {
        setError('Payment failed. Please try again.');
      }
      setStep('ready');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - click to close */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleCloseAttempt}
      />

      {/* Modal Card */}
      <Card className="relative w-full max-w-md animate-in fade-in zoom-in duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Unlock SubKiller</h2>
            <p className="text-sm text-gray-400">One-time payment, unlimited scans</p>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Summary Section */}
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

          {/* Benefits Section */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[rgb(0,212,255)]/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-[rgb(0,212,255)]" />
              </div>
              <div>
                <p className="text-white font-medium">Gasless Payment</p>
                <p className="text-sm text-gray-400">No gas fees on Plasma chain</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[rgb(0,212,255)]/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-[rgb(0,212,255)]" />
              </div>
              <div>
                <p className="text-white font-medium">One-time Purchase</p>
                <p className="text-sm text-gray-400">No recurring charges, ever</p>
              </div>
            </div>
          </div>

          {/* Progress/Status Message */}
          {isLoading && (
            <div className="bg-[rgb(0,212,255)]/10 border border-[rgb(0,212,255)]/30 rounded-lg p-3 text-[rgb(0,212,255)] text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              {step === 'signing' && 'Please sign the transaction in your wallet...'}
              {step === 'submitting' && 'Processing payment...'}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Action Button */}
          {!isWalletConnected ? (
            // Not connected - show connect button
            <Button
              className="w-full"
              size="lg"
              onClick={connectWallet}
            >
              <Wallet className="w-5 h-5 mr-2" />
              Connect Wallet to Pay
            </Button>
          ) : (
            // Connected - show pay button
            <Button
              className="w-full"
              size="lg"
              onClick={handlePay}
              loading={isLoading}
              disabled={isLoading}
            >
              <Wallet className="w-5 h-5 mr-2" />
              Pay {SUBKILLER_PRICE_DISPLAY} with USDT0
            </Button>
          )}

          {/* Footer */}
          <p className="text-xs text-center text-gray-500">
            Powered by Plasma Chain - Zero gas fees
          </p>
        </CardContent>
      </Card>

      {/* Confirm Close During Payment Modal */}
      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleConfirmClose}
        title="Cancel Payment?"
        message="A payment is currently in progress. Are you sure you want to close this and cancel the payment?"
        confirmText="Yes, Cancel"
        cancelText="Continue Payment"
        variant="danger"
      />
    </div>
  );
}
