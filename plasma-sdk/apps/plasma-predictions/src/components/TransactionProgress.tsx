"use client";

import { Loader2, CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type TxStatus = 'idle' | 'signing' | 'submitting' | 'confirming' | 'success' | 'error';

export interface TxState {
  status: TxStatus;
  txHash?: string;
  error?: string;
  retryable?: boolean;
}

interface TransactionProgressProps {
  state: TxState;
  onRetry?: () => void;
  onClose?: () => void;
  explorerUrl?: string;
}

const statusConfig = {
  idle: { icon: null, text: '', color: '' },
  signing: { icon: Loader2, text: 'Please sign in your wallet...', color: 'text-cyan-400' },
  submitting: { icon: Loader2, text: 'Submitting transaction...', color: 'text-cyan-400' },
  confirming: { icon: Loader2, text: 'Confirming on Plasma...', color: 'text-yellow-400' },
  success: { icon: CheckCircle, text: 'Transaction confirmed!', color: 'text-green-400' },
  error: { icon: XCircle, text: 'Transaction failed', color: 'text-red-400' },
};

export function TransactionProgress({ state, onRetry, onClose, explorerUrl = 'https://explorer.plasma.to' }: TransactionProgressProps) {
  if (state.status === 'idle') return null;

  const config = statusConfig[state.status];
  const Icon = config.icon;
  const isLoading = ['signing', 'submitting', 'confirming'].includes(state.status);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex flex-col items-center gap-4 py-6"
      >
        {/* Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
          state.status === 'success' ? 'bg-green-500/20' :
          state.status === 'error' ? 'bg-red-500/20' : 'bg-white/10'
        }`}>
          {Icon && (
            <Icon className={`w-8 h-8 ${config.color} ${isLoading ? 'animate-spin' : ''}`} />
          )}
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className={`text-lg font-semibold ${config.color}`}>
            {state.status === 'error' ? state.error || config.text : config.text}
          </p>
          {state.status === 'success' && (
            <p className="text-white/50 text-sm mt-1">Your bet has been placed successfully</p>
          )}
        </div>

        {/* Transaction hash link */}
        {state.txHash && (
          <a
            href={`${explorerUrl}/tx/${state.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>View on Explorer</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          {state.status === 'error' && state.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          {(state.status === 'success' || state.status === 'error') && onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-white/70"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
