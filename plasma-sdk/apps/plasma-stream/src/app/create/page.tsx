'use client';

/**
 * Create Stream Page - Multi-Step Wizard
 * 
 * Step 1: Recipient address
 * Step 2: Amount input (large display)
 * Step 3: Duration selector (visual days/weeks/months)
 * Step 4: Review & confirm
 */

import { useState, useMemo } from 'react';
import { usePlasmaWallet } from '@plasma-pay/privy-auth';
import { ConfirmModal } from '@plasma-pay/ui';
import { ArrowLeft, ArrowRight, Check, User, DollarSign, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseUnits } from 'viem';

type Step = 1 | 2 | 3 | 4;

const DURATION_OPTIONS = [
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
  { days: 60, label: '2 Months' },
  { days: 90, label: '3 Months' },
  { days: 180, label: '6 Months' },
  { days: 365, label: '1 Year' },
];

export default function CreateStreamPage() {
  const router = useRouter();
  const { wallet, authenticated } = usePlasmaWallet();
  
  // Form state
  const [step, setStep] = useState<Step>(1);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [cliffDays] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Validation
  const isValidAddress = useMemo(() => {
    return /^0x[a-fA-F0-9]{40}$/.test(recipient);
  }, [recipient]);

  const isValidAmount = useMemo(() => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  }, [amount]);

  // Calculate rate per day
  const ratePerDay = useMemo(() => {
    if (!isValidAmount) return '0.00';
    return (parseFloat(amount) / durationDays).toFixed(2);
  }, [amount, durationDays, isValidAmount]);

  // Navigation
  const canProceed = () => {
    switch (step) {
      case 1: return isValidAddress;
      case 2: return isValidAmount;
      case 3: return durationDays > 0;
      case 4: return true;
      default: return false;
    }
  };

  const goNext = () => {
    if (step < 4 && canProceed()) {
      setStep((step + 1) as Step);
    } else if (step === 4) {
      setShowConfirmModal(true);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  // Submit handler
  const handleConfirmCreate = async () => {
    if (!wallet || !recipient || !amount) return;

    setShowConfirmModal(false);
    setLoading(true);
    setError(null);

    try {
      const amountInUnits = parseUnits(amount, 6).toString();
      const durationSeconds = durationDays * 24 * 60 * 60;
      const cliffSeconds = cliffDays * 24 * 60 * 60;

      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: wallet.address,
          recipient,
          depositAmount: amountInUnits,
          duration: durationSeconds,
          cliffDuration: cliffSeconds,
          cancelable: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create stream');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep(4); // Stay on review step to show error
    } finally {
      setLoading(false);
    }
  };

  // Unauthenticated state
  if (!authenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-white/60 font-body">Please connect your wallet first.</p>
          <Link href="/" className="glass-button mt-6 inline-flex">
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 flex flex-col">
      {/* Demo Mode Badge */}
      <div className="demo-badge">Demo Mode</div>

      {/* Header */}
      <header className="flex items-center justify-between mb-8 max-w-lg mx-auto w-full">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors font-body touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        
        <h1 className="text-xl font-heading font-bold text-white">Create Stream</h1>
        
        <div className="w-16" /> {/* Spacer for centering */}
      </header>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">
        {/* Wizard Steps Indicator */}
        <div className="wizard-steps mb-8 animate-fade-in">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={`wizard-step ${s === step ? 'active' : s < step ? 'completed' : ''}`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`wizard-connector ${s < step ? 'active' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 animate-slide-up">
          {/* Step 1: Recipient */}
          {step === 1 && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-white">Recipient</h2>
                  <p className="text-white/50 text-sm font-body">Who are you paying?</p>
                </div>
              </div>

              <label className="block text-white/60 text-sm font-body mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="glass-input font-mono text-sm"
                autoFocus
                disabled={loading}
              />
              
              {recipient && !isValidAddress && (
                <p className="text-red-400 text-sm mt-2 font-body">
                  Please enter a valid Ethereum address
                </p>
              )}
            </div>
          )}

          {/* Step 2: Amount */}
          {step === 2 && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-white">Amount</h2>
                  <p className="text-white/50 text-sm font-body">Total payment amount</p>
                </div>
              </div>

              <div className="text-center mb-8">
                <div className="relative inline-flex items-center">
                  <span className="absolute left-0 text-4xl font-heading font-bold text-white/40">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="glass-input-large pl-12 pr-4 max-w-[280px]"
                    autoFocus
                    disabled={loading}
                  />
                </div>
                <p className="text-white/40 text-sm font-body mt-4">USDT0</p>
              </div>

              {/* Quick amount buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                {['100', '500', '1000', '5000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`px-4 py-2 rounded-xl text-sm font-body transition-all touch-target ${
                      amount === val 
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Duration */}
          {step === 3 && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-white">Duration</h2>
                  <p className="text-white/50 text-sm font-body">How long to stream?</p>
                </div>
              </div>

              {/* Duration Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => setDurationDays(option.days)}
                    className={`duration-option touch-target ${durationDays === option.days ? 'selected' : ''}`}
                  >
                    <span className="duration-option-value">{option.days}</span>
                    <span className="duration-option-label">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom duration input */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <label className="block text-white/60 text-sm font-body mb-2">
                  Custom Duration (days)
                </label>
                <input
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="glass-input text-center font-heading font-bold text-xl"
                  disabled={loading}
                />
              </div>

              {/* Rate preview */}
              {isValidAmount && (
                <div className="glass-card-subtle p-4 mt-6 text-center">
                  <p className="text-white/50 text-sm font-body">Payment Rate</p>
                  <p className="text-2xl font-heading font-bold text-brand-400 mt-1">
                    ${ratePerDay}/day
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-white">Review</h2>
                  <p className="text-white/50 text-sm font-body">Confirm stream details</p>
                </div>
              </div>

              {/* Review Card */}
              <div className="space-y-4">
                <div className="glass-card-subtle p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 font-body">Recipient</span>
                    <span className="font-mono text-white text-sm">
                      {recipient.slice(0, 8)}...{recipient.slice(-6)}
                    </span>
                  </div>
                </div>

                <div className="glass-card-subtle p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 font-body">Total Amount</span>
                    <span className="font-heading font-bold text-2xl text-white">
                      ${parseFloat(amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="glass-card-subtle p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 font-body">Duration</span>
                    <span className="font-heading font-semibold text-white">
                      {durationDays} days
                    </span>
                  </div>
                </div>

                <div className="glass-card-brand p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-300 font-body">Payment Rate</span>
                    <span className="font-heading font-bold text-xl text-brand-400">
                      ${ratePerDay}/day
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white/60 text-sm font-body text-center">
                  ⚠️ This will lock your funds until the stream completes or is cancelled.
                </p>
              </div>

              {/* Error display */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-sm font-body text-center">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="glass-button-secondary flex-1 touch-target"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed() || loading}
            className="glass-button flex-1 touch-target"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : step === 4 ? (
              <>
                <Check className="w-4 h-4" />
                Create Stream
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCreate}
        title="Create Payment Stream"
        message={`You are about to create a stream of $${amount || '0'} USDT0 to ${recipient ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : 'recipient'} over ${durationDays} days. This will lock your funds until the stream is completed or cancelled.`}
        confirmText="Create Stream"
        cancelText="Cancel"
        variant="primary"
        loading={loading}
      />
    </main>
  );
}
