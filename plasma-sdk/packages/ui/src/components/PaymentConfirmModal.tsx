"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, ArrowRight, Shield } from "lucide-react";

export interface PaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  recipient: string;
  recipientLabel?: string;
  amount: string;
  currency?: string;
  memo?: string;
  fee?: string;
}

export function PaymentConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  recipient,
  recipientLabel,
  amount,
  currency = "USDT0",
  memo,
  fee = "0",
}: PaymentConfirmModalProps) {
  const displayRecipient = recipientLabel || `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Payment"
      size="sm"
      closeOnOverlayClick={!loading}
    >
      <div className="space-y-6">
        {/* Amount */}
        <div className="text-center py-4">
          <p className="text-white/50 text-sm mb-1">You are sending</p>
          <p className="text-4xl font-bold gradient-text">${amount}</p>
          <p className="text-white/40 text-sm">{currency}</p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-white/60" />
          </div>
        </div>

        {/* Recipient */}
        <div className="text-center">
          <p className="text-white/50 text-sm mb-1">To</p>
          <p className="text-lg font-semibold text-white">{displayRecipient}</p>
          {recipientLabel && (
            <p className="text-white/40 text-xs font-mono mt-1">
              {recipient.slice(0, 10)}...{recipient.slice(-8)}
            </p>
          )}
        </div>

        {/* Memo */}
        {memo && (
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/50 text-xs mb-1">Memo</p>
            <p className="text-white/80 text-sm">&ldquo;{memo}&rdquo;</p>
          </div>
        )}

        {/* Fee breakdown */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Amount</span>
            <span className="text-white">${amount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Network fee</span>
            <span className="text-green-400">${fee} (free)</span>
          </div>
          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-white/10">
            <span className="text-white">Total</span>
            <span className="text-white">${amount}</span>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 text-white/40 text-xs justify-center">
          <Shield className="w-3 h-3" />
          <span>Secured by Plasma Chain</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            {loading ? "Sending..." : "Confirm & Send"}
          </Button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 text-amber-400/80 text-xs bg-amber-500/10 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Payments are irreversible. Please verify the recipient address.</span>
        </div>
      </div>
    </Modal>
  );
}
