"use client";

import { useState } from "react";
import { Send, User, DollarSign, AlertCircle, Wallet, CheckCircle, Zap } from "lucide-react";
import type { PlasmaEmbeddedWallet } from "@plasma-pay/privy-auth";
import { useAssistantReaction } from "@plasma-pay/ui";
import { sendMoney } from "@/lib/send";
import { MIN_AMOUNT, MAX_AMOUNT, AMOUNT_TOO_SMALL, AMOUNT_TOO_LARGE } from "@/lib/constants";
import { playSound, hapticFeedback } from "@/lib/sounds";
import { RecentContacts } from "./RecentContacts";
import { ModalPortal } from "./ui/ModalPortal";
import type { Contact } from "./ContactList";

interface SendMoneyFormProps {
  wallet: PlasmaEmbeddedWallet | null;
  balance?: string;
  onSuccess?: () => void;
  onFundWallet?: () => void;
  contacts?: Contact[];
  contactsLoading?: boolean;
  onPaymentSuccess?: (recipientAddress: string) => void;
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
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={!loading}
      zIndex={110}
      wrapperClassName="max-w-sm"
    >
      <div className="relative w-full bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6">
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
    </ModalPortal>
  );
}

// Success Animation Component
function SuccessOverlay({
  isVisible,
  amount,
  recipient,
  txHash,
  claimUrl,
  onClose,
}: {
  isVisible: boolean;
  amount: string;
  recipient: string;
  txHash?: string;
  claimUrl?: string;
  onClose: () => void;
}) {
  if (!isVisible) return null;
  
  const isClaimFlow = !!claimUrl;

  return (
    <ModalPortal
      isOpen={isVisible}
      onClose={onClose}
      closeOnBackdrop={false}
      zIndex={120}
      backdropClassName="bg-black/80 backdrop-blur-md"
      wrapperClassName="max-w-none w-full h-full p-0"
    >
      <div className="relative w-full h-full flex items-center justify-center">
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
        <p className="text-xl text-white mb-1">{isClaimFlow ? 'pending for' : 'sent to'}</p>
        <p className="text-lg text-[rgb(0,212,255)] font-medium mb-6">{recipient}</p>

        {isClaimFlow ? (
          <div className="text-center mb-6">
            <p className="text-white/70 text-sm mb-3">
              They&apos;ll receive an email to claim the funds
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(claimUrl!)}
              className="text-white/50 text-sm hover:text-white/70 underline"
            >
              Copy claim link
            </button>
          </div>
        ) : txHash && (
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
    </ModalPortal>
  );
}

export function SendMoneyForm({ 
  wallet, 
  balance, 
  onSuccess, 
  onFundWallet,
  contacts = [],
  contactsLoading = false,
  onPaymentSuccess,
}: SendMoneyFormProps) {
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI Assistant reactions
  const { onSuccess: assistantSuccess, onError: assistantError, onLoading: assistantLoading } = useAssistantReaction();

  // Handle selecting a contact
  const handleSelectContact = (contact: Contact) => {
    if (contact.contactAddress) {
      setRecipient(contact.contactAddress);
      setRecipientName(contact.name);
    } else if (contact.email) {
      setRecipient(contact.email);
      setRecipientName(contact.name);
    } else if (contact.phone) {
      setRecipient(contact.phone);
      setRecipientName(contact.name);
    }
    playSound('tap');
  };

  // Clear recipient name when manually editing
  const handleRecipientChange = (value: string) => {
    setRecipient(value);
    if (recipientName && value !== recipient) {
      setRecipientName(null);
    }
  };
  
  // Modal states
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | undefined>();
  const [successClaimUrl, setSuccessClaimUrl] = useState<string | undefined>();

  // Amount validation
  const numericBalance = parseFloat(balance || "0");
  const numericAmount = parseFloat(amount || "0");
  const insufficientBalance = numericAmount > 0 && numericAmount > numericBalance;
  const amountTooSmall = numericAmount > 0 && numericAmount < MIN_AMOUNT;
  const amountTooLarge = numericAmount > MAX_AMOUNT;

  // Get amount validation error message
  const getAmountError = (): string | null => {
    if (amountTooSmall) return AMOUNT_TOO_SMALL;
    if (amountTooLarge) return AMOUNT_TOO_LARGE;
    if (insufficientBalance) return `Insufficient balance. You have $${numericBalance.toFixed(2)} USDT0.`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !recipient || !amount) return;
    
    // Check amount validation
    const amountError = getAmountError();
    if (amountError) {
      setError(amountError);
      return;
    }
    
    // Show confirmation modal instead of sending immediately
    setError(null);
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    if (!wallet || loading) return; // Prevent double-submit

    setLoading(true);
    setError(null);
    assistantLoading(); // Tell assistant we're processing

    try {
      const result = await sendMoney(wallet, {
        recipientIdentifier: recipient,
        amount,
      });

      if (result.success) {
        setShowConfirm(false);
        setSuccessTxHash(result.txHash);
        setSuccessClaimUrl(result.claimUrl);
        setShowSuccess(true);
        
        // Sound and haptic feedback
        playSound('success');
        hapticFeedback('medium');
        
        // Tell assistant about success
        assistantSuccess(`Payment of $${amount} sent! 🎉`);
        
        // Notify parent about payment success (for updating contact's lastPayment)
        if (onPaymentSuccess && /^0x[a-fA-F0-9]{40}$/.test(recipient)) {
          onPaymentSuccess(recipient);
        }
      } else {
        playSound('error');
        hapticFeedback('light');
        const errorMsg = result.error || "Oops! Something went wrong. Your money is safe - try again?";
        setError(errorMsg);
        assistantError("Payment failed. Let me help you fix this!");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      assistantError("Something went wrong. Don't worry, your funds are safe!");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setRecipient("");
    setRecipientName(null);
    setAmount("");
    setSuccessTxHash(undefined);
    setSuccessClaimUrl(undefined);
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
        className="clay-card p-6 md:p-8 space-y-5"
      >
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-[rgb(0,212,255)]" />
          Send Money
        </h2>

        {/* Recent contacts */}
        {contacts.length > 0 && !recipient && (
          <RecentContacts
            contacts={contacts}
            onSelect={handleSelectContact}
            loading={contactsLoading}
            limit={5}
          />
        )}

        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">
            Who are you paying?
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              value={recipientName || recipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              placeholder="Email, phone, or wallet address"
              className="clay-input w-full pl-12 py-4 text-white placeholder:text-white/30"
              disabled={loading}
              data-avatar-tip="Enter an email, phone, or wallet address."
            />
            {recipient && isValidRecipient && (
              <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
            )}
          </div>
          {recipientName && (
            <p className="text-[rgb(0,212,255)] text-xs mt-2 flex items-center gap-1">
              Sending to {recipientName}
            </p>
          )}
          {recipient && !isValidRecipient && !recipientName && (
            <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Enter a valid email, phone, or wallet address
            </p>
          )}
        </div>

        <div>
          <label htmlFor="send-amount" className="block text-white/60 text-sm mb-2 font-medium">
            How much?
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" aria-hidden="true" />
            <input
              id="send-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="clay-input w-full pl-14 pr-20 py-5 text-3xl font-bold text-white placeholder:text-white/20"
              disabled={loading}
              aria-label="Amount in USD"
              aria-invalid={insufficientBalance || amountTooSmall || amountTooLarge}
              aria-describedby={insufficientBalance || amountTooSmall || amountTooLarge ? "amount-error" : undefined}
              data-avatar-tip="Enter the amount to send in USD."
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-medium text-sm" aria-hidden="true">
              USD
            </span>
          </div>
          
          {/* Quick amount buttons - colorful and fun */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            {[
              { amount: 5, color: "from-emerald-400 to-emerald-500", emoji: "☕" },
              { amount: 10, color: "from-cyan-400 to-cyan-500", emoji: "🍕" },
              { amount: 25, color: "from-violet-400 to-violet-500", emoji: "🎬" },
              { amount: 50, color: "from-pink-400 to-pink-500", emoji: "🎁" },
              { amount: 100, color: "from-amber-400 to-amber-500", emoji: "🎉" },
            ].map(({ amount: quickAmount, color, emoji }) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => {
                  setAmount(quickAmount.toString());
                  playSound('tap');
                }}
                className={`py-3 px-2 rounded-2xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${
                  amount === quickAmount.toString()
                    ? `bg-gradient-to-br ${color} text-white shadow-lg`
                    : "clay-button-secondary hover:shadow-md"
                }`}
              >
                <span className="block text-lg mb-0.5">{emoji}</span>
                <span className={amount === quickAmount.toString() ? "text-white" : "text-[rgb(var(--text-primary))]"}>
                  ${quickAmount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount validation warning */}
        {(insufficientBalance || amountTooSmall || amountTooLarge) && !error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {amountTooSmall && AMOUNT_TOO_SMALL}
                {amountTooLarge && AMOUNT_TOO_LARGE}
                {insufficientBalance && !amountTooSmall && !amountTooLarge && `Insufficient balance (${numericBalance.toFixed(2)} available)`}
              </span>
            </div>
            {insufficientBalance && onFundWallet && !amountTooSmall && !amountTooLarge && (
              <button
                type="button"
                onClick={onFundWallet}
                className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 transition-colors"
              >
                <Wallet className="w-3 h-3" />
                Add funds to your wallet
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-4 py-3 text-sm backdrop-blur-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full clay-button py-4 text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          data-avatar-tip="Review and send your payment."
        >
          <Send className="w-5 h-5" />
          {amount && parseFloat(amount) > 0 ? `Send $${parseFloat(amount).toFixed(2)} Now` : "Review Payment"}
        </button>

        <div className="flex items-center justify-center gap-4 pt-2">
          <p className="text-white/40 text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Zero fees
          </p>
          <p className="text-white/40 text-xs flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[rgb(0,212,255)]" />
            Instant delivery
          </p>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSend}
        loading={loading}
        recipient={recipientName || recipient}
        amount={amount}
      />

      {/* Success Animation */}
      <SuccessOverlay
        isVisible={showSuccess}
        amount={amount}
        recipient={recipientName || recipient}
        txHash={successTxHash}
        claimUrl={successClaimUrl}
        onClose={handleSuccessClose}
      />
    </>
  );
}
