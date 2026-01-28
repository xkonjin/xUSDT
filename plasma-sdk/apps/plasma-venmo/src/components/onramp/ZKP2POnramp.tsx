'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useZKP2POnramp } from '@/hooks/useZKP2POnramp';

interface ZKP2POnrampProps {
  recipientAddress: string;
  onSuccess?: (txHash: string) => void;
  onClose?: () => void;
  defaultAmount?: string;
  defaultCurrency?: string;
}

type PaymentPlatform = 'venmo' | 'revolut' | 'wise' | 'cashapp';

interface PaymentOption {
  id: PaymentPlatform;
  name: string;
  icon: string;
  color: string;
  currencies: string[];
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'venmo',
    name: 'Venmo',
    icon: '💳',
    color: 'from-blue-500 to-blue-600',
    currencies: ['USD'],
  },
  {
    id: 'revolut',
    name: 'Revolut',
    icon: '🏦',
    color: 'from-purple-500 to-purple-600',
    currencies: ['USD', 'EUR', 'GBP'],
  },
  {
    id: 'wise',
    name: 'Wise',
    icon: '🌍',
    color: 'from-green-500 to-green-600',
    currencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'],
  },
  {
    id: 'cashapp',
    name: 'Cash App',
    icon: '💵',
    color: 'from-emerald-500 to-emerald-600',
    currencies: ['USD'],
  },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
};

export function ZKP2POnramp({
  recipientAddress,
  onSuccess,
  onClose,
  defaultAmount = '100',
  defaultCurrency = 'USD',
}: ZKP2POnrampProps) {
  const {
    state,
    isLoading,
    error,
    isMobile,
    openInstallPage,
    requestConnection,
    startOnramp,
    onProofComplete,
  } = useZKP2POnramp();

  const [step, setStep] = useState<'amount' | 'payment' | 'processing' | 'success'>('amount');
  const [amount, setAmount] = useState(defaultAmount);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [selectedPayment, setSelectedPayment] = useState<PaymentPlatform | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Subscribe to proof completion
  useEffect(() => {
    const unsubscribe = onProofComplete((proof) => {
      console.log('Proof completed:', proof);
      const hash = (proof as { txHash?: string })?.txHash || 'success';
      setTxHash(hash);
      setStep('success');
      onSuccess?.(hash);
    });

    return unsubscribe;
  }, [onProofComplete, onSuccess]);

  const handleAmountSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStep('payment');
  };

  const handlePaymentSelect = async (payment: PaymentPlatform) => {
    setSelectedPayment(payment);
    setStep('processing');

    await startOnramp({
      recipientAddress,
      inputAmount: amount,
      inputCurrency: currency,
      paymentPlatform: payment,
    });
  };

  const handleRetry = () => {
    setStep('amount');
    setSelectedPayment(null);
    setTxHash(null);
  };

  // Mobile not supported view
  if (isMobile) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <span className="text-3xl">📱</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Desktop Required</h2>
          <p className="mb-4 text-gray-600">
            ZKP2P on-ramp requires the Peer browser extension, which is only available on desktop.
          </p>
          <p className="text-sm text-gray-500">
            Please visit Plenmo on your desktop computer to add funds.
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 transition hover:bg-gray-50"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  // Extension not installed view
  if (state === 'needs_install') {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <span className="text-3xl">🔌</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Install Peer Extension</h2>
          <p className="mb-4 text-gray-600">
            To add funds with Venmo, Revolut, or other payment apps, you need to install the Peer browser extension.
          </p>
          <button
            onClick={openInstallPage}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:opacity-90"
          >
            Install Peer Extension
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Needs connection view
  if (state === 'needs_connection') {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <span className="text-3xl">🔗</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Connect Peer Extension</h2>
          <p className="mb-4 text-gray-600">
            Click below to connect Plenmo with your Peer extension.
          </p>
          <button
            onClick={requestConnection}
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect Extension'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Add Funds</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-white/80">
          Convert fiat to USDC instantly with zero fees
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex border-b border-gray-100 px-6 py-3">
        {['Amount', 'Payment', 'Complete'].map((label, index) => {
          const stepIndex = ['amount', 'payment', 'processing', 'success'].indexOf(step);
          const isActive = index <= (stepIndex === 3 ? 2 : stepIndex);
          return (
            <div key={label} className="flex flex-1 items-center">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {label}
              </span>
              {index < 2 && (
                <div className={`mx-2 h-0.5 flex-1 ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Step 1: Amount */}
          {step === 'amount' && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  How much would you like to add?
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">
                    {CURRENCY_SYMBOLS[currency] || '$'}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 py-4 pl-12 pr-20 text-2xl font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="mb-6 flex gap-2">
                {['25', '50', '100', '250'].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount)}
                    className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition ${
                      amount === quickAmount
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {CURRENCY_SYMBOLS[currency]}{quickAmount}
                  </button>
                ))}
              </div>

              {/* Info box */}
              <div className="mb-6 rounded-xl bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <p className="font-medium text-green-900">Zero fees, instant transfer</p>
                    <p className="text-sm text-green-700">
                      You&apos;ll receive approximately {CURRENCY_SYMBOLS[currency]}{amount || '0'} in USDC
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAmountSubmit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          )}

          {/* Step 2: Payment Method */}
          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-4">
                <button
                  onClick={() => setStep('amount')}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>

              <div className="mb-4 rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">You&apos;re adding</p>
                <p className="text-2xl font-bold text-gray-900">
                  {CURRENCY_SYMBOLS[currency]}{amount} {currency}
                </p>
              </div>

              <p className="mb-4 text-sm font-medium text-gray-700">
                Select payment method
              </p>

              <div className="space-y-3">
                {PAYMENT_OPTIONS.filter((p) => p.currencies.includes(currency)).map((payment) => (
                  <button
                    key={payment.id}
                    onClick={() => handlePaymentSelect(payment.id)}
                    disabled={isLoading}
                    className="flex w-full items-center gap-4 rounded-xl border-2 border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${payment.color}`}>
                      <span className="text-2xl">{payment.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{payment.name}</p>
                      <p className="text-sm text-gray-500">Pay with {payment.name}</p>
                    </div>
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center py-8"
            >
              <div className="mx-auto mb-6 h-16 w-16">
                <svg className="animate-spin h-16 w-16 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Processing Payment</h3>
              <p className="mb-4 text-gray-600">
                Complete the payment in the Peer extension side panel.
              </p>
              <p className="text-sm text-gray-500">
                This window will update automatically when complete.
              </p>

              {error && (
                <div className="mt-6">
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 mb-4">
                    {error}
                  </div>
                  <button
                    onClick={handleRetry}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
              >
                <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">Funds Added!</h3>
              <p className="mb-2 text-gray-600">
                {CURRENCY_SYMBOLS[currency]}{amount} has been added to your account.
              </p>
              {txHash && txHash !== 'success' && (
                <p className="mb-4 text-sm text-gray-500">
                  Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-4 font-semibold text-white transition hover:opacity-90"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>Powered by</span>
          <span className="font-semibold text-gray-700">ZKP2P</span>
          <span>•</span>
          <span>Zero-knowledge verified</span>
        </div>
      </div>
    </div>
  );
}

export default ZKP2POnramp;
