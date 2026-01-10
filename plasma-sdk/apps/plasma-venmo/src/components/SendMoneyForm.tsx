"use client";

import { useState } from "react";
import { Send, User, DollarSign, AlertCircle } from "lucide-react";
import type { PlasmaEmbeddedWallet } from "@plasma-pay/privy-auth";
import { sendMoney } from "@/lib/send";

interface SendMoneyFormProps {
  wallet: PlasmaEmbeddedWallet | null;
  onSuccess?: () => void;
}

// Confirmation Modal Component
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  recipient,
  amount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  recipient: string;
  amount: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />
      <div className="relative w-full max-w-sm bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6 animate-fade-in-scale">
        <h3 className="text-xl font-bold text-white mb-6 text-center">Confirm Payment</h3>
        
        {/* Amount */}
        <div className="text-center mb-6">
          <p className="text-white/50 text-sm mb-1">Sending</p>
          <p className="text-4xl font-bold gradient-text">${amount}</p>
          <p className="text-white/40 text-sm">USDT0</p>
        </div>

        {/* Recipient */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <p className="text-white/50 text-sm mb-1">To</p>
          <p className="text-white font-medium">{recipient}</p>
        </div>

        {/* Fee info */}
        <div className="flex justify-between text-sm mb-6 px-2">
          <span className="text-white/50">Network Fee</span>
          <span className="text-green-400 font-medium">$0.00 (Free!)</span>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 text-amber-400/80 text-xs bg-amber-500/10 rounded-xl p-3 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Payments are final and cannot be reversed.</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)] text-black font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Success Animation Component
function SuccessOverlay({
  isVisible,
  amount,
  recipient,
  txHash,
  onClose,
}: {
  isVisible: boolean;
  amount: string;
  recipient: string;
  txHash?: string;
  onClose: () => void;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#00d4ff', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)],
              animationDelay: `${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative text-center animate-success-bounce">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <p className="text-4xl font-bold text-white mb-2">${amount}</p>
        <p className="text-xl text-white mb-1">sent to</p>
        <p className="text-lg text-[rgb(0,212,255)] font-medium mb-6">{recipient}</p>

        {txHash && (
          <a
            href={`https://scan.plasma.to/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/50 text-sm hover:text-white/70 underline mb-6 block"
          >
            View on Plasma Scan →
          </a>
        )}

        <button
          onClick={onClose}
          className="mt-4 px-8 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-white/90 transition-colors"
        >
          Done
        </button>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        @keyframes success-bounce {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-success-bounce {
          animation: success-bounce 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export function SendMoneyForm({ wallet, onSuccess }: SendMoneyFormProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !recipient || !amount) return;
    
    // Show confirmation modal instead of sending immediately
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    if (!wallet) return;

    setLoading(true);
    setError(null);

    try {
      const result = await sendMoney(wallet, {
        recipientIdentifier: recipient,
        amount,
      });

      if (result.success) {
        setShowConfirm(false);
        setSuccessTxHash(result.txHash);
        setShowSuccess(true);
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 100]);
        }
      } else {
        setError(result.error || "Transaction failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setRecipient("");
    setAmount("");
    setSuccessTxHash(undefined);
    onSuccess?.();
  };

  const isValidRecipient =
    recipient.includes("@") || /^\+?\d{10,}$/.test(recipient) || /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const isValidAmount = parseFloat(amount) > 0;
  const canSubmit = wallet && isValidRecipient && isValidAmount && !loading;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="liquid-glass rounded-3xl p-6 md:p-8 space-y-5"
      >
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-[rgb(0,212,255)]" />
          Send Money
        </h2>

        <div>
          <label className="block text-white/50 text-sm mb-2 font-medium">
            To (email, phone, or wallet)
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="friend@email.com"
              className="input-glass w-full pl-12"
              disabled={loading}
            />
          </div>
          {recipient && !isValidRecipient && (
            <p className="text-amber-400 text-xs mt-2">Enter a valid email, phone, or wallet address</p>
          )}
        </div>

        <div>
          <label className="block text-white/50 text-sm mb-2 font-medium">
            Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="input-glass w-full pl-12 text-2xl font-semibold"
              disabled={loading}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">
              USDT0
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          Review Payment
        </button>

        <p className="text-white/30 text-xs text-center flex items-center justify-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Zero gas fees on Plasma Chain
        </p>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSend}
        loading={loading}
        recipient={recipient}
        amount={amount}
      />

      {/* Success Animation */}
      <SuccessOverlay
        isVisible={showSuccess}
        amount={amount}
        recipient={recipient}
        txHash={successTxHash}
        onClose={handleSuccessClose}
      />
    </>
  );
}
