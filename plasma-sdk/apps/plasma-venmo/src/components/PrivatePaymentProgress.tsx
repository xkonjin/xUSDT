"use client";

import { useState, useEffect, useRef } from "react";
import {
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { ModalPortal } from "./ui/ModalPortal";

const STEPS = [
  { key: "waiting", label: "Awaiting deposit", status: 0 },
  { key: "confirming", label: "Confirming deposit", status: 1 },
  { key: "exchanging", label: "Processing swap", status: 2 },
  { key: "anonymizing", label: "Privacy routing", status: 3 },
  { key: "completed", label: "Complete", status: 4 },
];

interface PrivatePaymentProgressProps {
  houdiniId: string;
  amount: string;
  recipient: string;
  onComplete: (txHash?: string) => void;
  onClose: () => void;
}

export function PrivatePaymentProgress({
  houdiniId,
  amount,
  recipient,
  onComplete,
  onClose,
}: PrivatePaymentProgressProps) {
  const [currentStatus, setCurrentStatus] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    // Status polling
    async function pollStatus() {
      try {
        const res = await fetch(`/api/houdini?action=status&id=${houdiniId}`);
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setCurrentStatus(data.status);

        if (data.status === 4) {
          // COMPLETED
          setTxHash(data.txHash);
          onComplete(data.txHash);
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        } else if (data.status >= 5) {
          // EXPIRED, FAILED, REFUNDED, DELETED
          const messages: Record<number, string> = {
            5: "Swap expired. Your funds will be refunded.",
            6: "Swap failed. Your funds will be refunded.",
            7: "Swap was refunded to your wallet.",
            8: "Order was cancelled.",
          };
          setError(messages[data.status] || "Swap encountered an issue.");
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        // Network error, keep polling
      }
    }

    pollStatus();
    pollRef.current = setInterval(pollStatus, 15000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [houdiniId, onComplete]);

  const formatElapsed = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const isTerminal = currentStatus >= 4;
  const isSuccess = currentStatus === 4;
  const isError = currentStatus >= 5;

  return (
    <ModalPortal
      isOpen
      onClose={isTerminal ? onClose : () => {}}
      closeOnBackdrop={isTerminal}
      zIndex={120}
      wrapperClassName="max-w-sm"
    >
      <div className="clay-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-plenmo-500" />
            <h3 className="text-lg font-heading font-bold text-white">
              Private Payment
            </h3>
          </div>
          {isTerminal && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          )}
        </div>

        {/* Amount */}
        <div className="text-center mb-6">
          <p className="text-3xl font-heading font-bold text-white">
            ${amount}
          </p>
          <p className="text-white/40 text-sm mt-1">to {recipient}</p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-0 mb-6">
          {STEPS.map((step, i) => {
            const isActive = currentStatus === step.status && !isError;
            const isComplete = currentStatus > step.status || isSuccess;

            return (
              <div key={step.key} className="flex items-start gap-3">
                {/* Dot / Icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isComplete
                        ? "bg-green-500"
                        : isActive
                        ? "bg-plenmo-500 animate-pulse"
                        : "bg-white/10"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-6 ${
                        isComplete ? "bg-green-500/50" : "bg-white/10"
                      }`}
                    />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`text-sm pt-0.5 ${
                    isActive
                      ? "text-white font-medium"
                      : isComplete
                      ? "text-green-400"
                      : "text-white/30"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Error State */}
        {isError && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4 text-center">
            <p className="text-green-400 text-sm font-medium">
              Payment delivered privately!
            </p>
            {txHash && (
              <a
                href={`https://scan.plasma.to/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-plenmo-500 text-xs hover:underline mt-1 block"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {/* Timer + Estimate */}
        <div className="flex items-center justify-between text-xs text-white/30">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatElapsed(elapsed)}</span>
          </div>
          {!isTerminal && <span>Estimated: 15-45 min</span>}
        </div>

        {/* Close button for terminal states */}
        {isTerminal && (
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl clay-button clay-button-primary text-sm font-semibold"
          >
            {isSuccess ? "Done" : "Close"}
          </button>
        )}
      </div>
    </ModalPortal>
  );
}
