"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink, 
  Wifi, 
  WifiOff,
  Clock,
  AlertCircle
} from "lucide-react";

export type PaymentStatus = 
  | 'idle' 
  | 'signing' 
  | 'submitting' 
  | 'confirming' 
  | 'complete' 
  | 'error';

export interface PaymentProgressProps {
  status: PaymentStatus;
  txHash?: string;
  error?: string;
  retryable?: boolean;
  onRetry?: () => void;
  onClose?: () => void;
  explorerUrl?: string;
  recipient?: string;
  amount?: string;
}

const statusSteps = [
  { id: 'signing', label: 'Signing', description: 'Confirm in your wallet', estimatedTime: '~5s' },
  { id: 'submitting', label: 'Submitting', description: 'Sending to network', estimatedTime: '~3s' },
  { id: 'confirming', label: 'Confirming', description: 'Processing on blockchain', estimatedTime: '~15s' },
  { id: 'complete', label: 'Complete', description: 'Payment successful', estimatedTime: '' },
] as const;

const statusConfig = {
  idle: { icon: null, text: '', color: '', description: '' },
  signing: { icon: Loader2, text: 'Please sign the transaction', color: 'text-cyan-400', description: 'Check your wallet to sign the payment' },
  submitting: { icon: Loader2, text: 'Submitting transaction...', color: 'text-cyan-400', description: 'Sending your payment to the network' },
  confirming: { icon: Loader2, text: 'Confirming on Plasma...', color: 'text-yellow-400', description: 'Transaction is being confirmed on the blockchain' },
  complete: { icon: CheckCircle, text: 'Payment successful!', color: 'text-green-400', description: 'Your payment has been completed' },
  error: { icon: XCircle, text: 'Payment failed', color: 'text-red-400', description: 'Something went wrong with your payment' },
};

// Progress Ring Component
function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 6,
  color = "rgb(0, 212, 255)" 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Inner content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-white">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

// Connection Status Indicator
function ConnectionStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}

// Step Indicator Component
function StepIndicator({ 
  step, 
  index, 
  isComplete, 
  isCurrent 
}: { 
  step: typeof statusSteps[number]; 
  index: number; 
  isComplete: boolean; 
  isCurrent: boolean; 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-center gap-3 ${isComplete ? 'opacity-60' : ''}`}
    >
      {/* Step circle */}
      <div
        className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
          isComplete
            ? 'bg-green-500 text-white'
            : isCurrent
            ? 'bg-[rgb(0,212,255)] text-black shadow-[0_0_20px_rgba(0,212,255,0.4)]'
            : 'bg-white/10 text-white/40'
        }`}
      >
        {isComplete ? (
          <CheckCircle className="w-4 h-4" />
        ) : isCurrent ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <span className="text-sm font-medium">{index + 1}</span>
        )}
      </div>

      {/* Step text */}
      <div className="flex flex-col">
        <p
          className={`font-medium text-sm ${
            isComplete
              ? 'text-green-400'
              : isCurrent
              ? 'text-white'
              : 'text-white/40'
          }`}
        >
          {step.label}
        </p>
        <p className="text-xs text-white/40">{step.description}</p>
        {isCurrent && step.estimatedTime && (
          <div className="flex items-center gap-1 text-xs text-[rgb(0,212,255)] mt-1">
            <Clock className="w-3 h-3" />
            <span>{step.estimatedTime}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function PaymentProgress({
  status,
  txHash,
  error,
  retryable = true,
  onRetry,
  onClose,
  explorerUrl = 'https://scan.plasma.to',
  recipient,
  amount,
}: PaymentProgressProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [progress, setProgress] = useState(0);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Animate progress based on status
  useEffect(() => {
    switch (status) {
      case 'idle':
        setProgress(0);
        break;
      case 'signing':
        setProgress(25);
        break;
      case 'submitting':
        setProgress(50);
        break;
      case 'confirming':
        setProgress(75);
        break;
      case 'complete':
        setProgress(100);
        break;
      case 'error':
        setProgress(0);
        break;
    }
  }, [status]);

  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = ['signing', 'submitting', 'confirming'].includes(status);
  const currentStepIndex = statusSteps.findIndex(s => s.id === status);
  const isError = status === 'error';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full"
      >
        {/* Main Card */}
        <div className="clay-card p-6 space-y-6">
          {/* Header with status and connection */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                {config.text}
              </h3>
              <p className="text-white/50 text-sm">{config.description}</p>
            </div>
            {isOnline !== undefined && (
              <ConnectionStatus isOnline={isOnline} />
            )}
          </div>

          {/* Progress visualization */}
          <div className="flex items-center justify-center gap-6">
            {isError ? (
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
            ) : status === 'complete' ? (
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            ) : (
              <ProgressRing progress={progress} />
            )}
          </div>

          {/* Step indicators */}
          {!isError && (
            <div className="space-y-4">
              {statusSteps.map((step, index) => {
                const isComplete = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <StepIndicator
                    key={step.id}
                    step={step}
                    index={index}
                    isComplete={isComplete}
                    isCurrent={isCurrent}
                  />
                );
              })}
            </div>
          )}

          {/* Payment details for complete/error states */}
          {(status === 'complete' || isError) && (
            <div className="bg-white/5 rounded-2xl p-4 space-y-3">
              {amount && recipient && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Amount</span>
                    <span className="text-white font-medium">${amount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Recipient</span>
                    <span className="text-white font-medium truncate ml-4">
                      {recipient}
                    </span>
                  </div>
                </>
              )}
              {txHash && (
                <a
                  href={`${explorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-[rgb(0,212,255)] hover:text-[rgb(0,212,255)]/80 transition pt-2 border-t border-white/10"
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Error details */}
          {isError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-400 text-sm font-medium mb-1">
                    {error || 'Payment failed'}
                  </p>
                  <p className="text-red-400/70 text-xs">
                    Your funds are safe. Please try again or contact support if the issue persists.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isError && retryable && onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition text-white font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
            {(status === 'complete' || isError) && onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[rgb(29,185,84)] to-[rgb(25,163,74)] text-black font-semibold hover:opacity-90 transition"
              >
                {status === 'complete' ? 'Done' : 'Close'}
              </button>
            )}
            {isLoading && (
              <button
                onClick={onClose}
                className="w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-white/50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
