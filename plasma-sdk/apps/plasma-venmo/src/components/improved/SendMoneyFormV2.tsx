

"use client";

import { useState, useReducer, useEffect, useCallback, memo } from "react";
import { Send, User, DollarSign, AlertCircle, Wallet, CheckCircle, Zap, X } from "lucide-react";
import type { PlasmaEmbeddedWallet } from "@plasma-pay/privy-auth";
import { PaymentProgress, type PaymentStatus } from "@plasma-pay/ui";
import { sendMoney } from "@/lib/send";
import { MIN_AMOUNT, MAX_AMOUNT, AMOUNT_TOO_SMALL, AMOUNT_TOO_LARGE, INSUFFICIENT_BALANCE } from "@/lib/constants";
import { playSound, hapticFeedback } from "@/lib/sounds";
import { RecentContacts, ContactSkeleton } from "./RecentContacts"; // Assuming a skeleton is available
import { ModalPortal } from "../ui/ModalPortal";
import type { Contact } from "../ContactList";

// --- TYPE DEFINITIONS ---
interface SendMoneyFormProps {
  wallet: PlasmaEmbeddedWallet | null;
  balance?: string;
  contacts?: Contact[];
  contactsLoading?: boolean;
  selectedContact?: Contact | null;
  onSuccess?: (txHash: string, recipientAddress: string) => void;
  onFundWallet?: () => void;
  onClearSelectedContact?: () => void;
}

// --- STATE MANAGEMENT (useReducer) ---
// Enhanced state management for the payment flow, making transitions more robust.
type PaymentFlowState = {
  status: PaymentStatus;
  error: string | null;
  txHash?: string;
  claimUrl?: string;
  showConfirmation: boolean;
  showSuccess: boolean;
};

type PaymentFlowAction = 
  | { type: 'START_SEND' }
  | { type: 'CONFIRM' }
  | { type: 'SEND_SUCCESS'; payload: { txHash: string; claimUrl?: string } }
  | { type: 'SEND_ERROR'; payload: { error: string } }
  | { type: 'RESET' }
  | { type: 'CLOSE_MODAL' };

const initialState: PaymentFlowState = {
  status: 'idle',
  error: null,
  txHash: undefined,
  claimUrl: undefined,
  showConfirmation: false,
  showSuccess: false,
};

function paymentFlowReducer(state: PaymentFlowState, action: PaymentFlowAction): PaymentFlowState {
  switch (action.type) {
    case 'START_SEND':
      return { ...state, showConfirmation: true, error: null };
    case 'CONFIRM':
      return { ...state, status: 'signing', error: null };
    case 'SEND_SUCCESS':
      playSound('success');
      hapticFeedback('medium');
      return { 
        ...state, 
        status: 'complete', 
        txHash: action.payload.txHash,
        claimUrl: action.payload.claimUrl,
        showConfirmation: false,
        showSuccess: true,
      };
    case 'SEND_ERROR':
      playSound('error');
      hapticFeedback('light');
      return { ...state, status: 'error', error: action.payload.error };
    case 'CLOSE_MODAL':
      return { ...state, showConfirmation: false };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// --- HELPER & CHILD COMPONENTS ---

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  recipient: string;
  amount: string;
  paymentStatus: PaymentStatus;
  paymentError: string | null;
  paymentTxHash?: string;
  onRetry: () => void;
}

const MemoizedConfirmationModal = memo(function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  recipient,
  amount,
  paymentStatus,
  paymentError,
  onRetry,
}: ConfirmationModalProps) {
  if (!isOpen) return null;
  
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="clay-card p-6 max-w-md w-full space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Confirm Payment</h3>
            <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {paymentStatus === 'error' && paymentError ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {paymentError}
              <button onClick={onRetry} className="block mt-2 text-xs underline">Try again</button>
            </div>
          ) : (
            <>
              <div className="text-center py-4">
                <p className="text-white/60 text-sm">Sending to</p>
                <p className="text-white font-medium truncate">{recipient}</p>
                <p className="text-3xl font-bold text-plenmo-500 mt-2">${parseFloat(amount).toFixed(2)}</p>
              </div>
              
              {(paymentStatus === 'signing' || paymentStatus === 'submitting') && (
                <PaymentProgress status={paymentStatus} />
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 clay-button py-3 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 clay-button clay-button-primary py-3 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
});

interface SuccessOverlayProps {
  isVisible: boolean;
  amount: string;
  recipient: string;
  txHash?: string;
  claimUrl?: string;
  onClose: () => void;
}

const MemoizedSuccessOverlay = memo(function SuccessOverlay({
  isVisible,
  amount,
  recipient,
  txHash,
  claimUrl,
  onClose,
}: SuccessOverlayProps) {
  if (!isVisible) return null;
  
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="clay-card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Payment Sent!</h3>
          <p className="text-white/60">
            ${parseFloat(amount).toFixed(2)} sent to {recipient}
          </p>
          {claimUrl && (
            <a href={claimUrl} target="_blank" rel="noopener noreferrer" className="text-plenmo-500 text-sm underline block">
              Share claim link
            </a>
          )}
          {txHash && (
            <p className="text-white/40 text-xs truncate">TX: {txHash}</p>
          )}
          <button onClick={onClose} className="clay-button clay-button-primary w-full py-3 mt-4">
            Done
          </button>
        </div>
      </div>
    </ModalPortal>
  );
});

const AmountInput = ({ amount, setAmount, balance, onFundWallet, disabled }) => {
  const numericBalance = parseFloat(balance || "0");
  const numericAmount = parseFloat(amount || "0");
  const insufficientBalance = numericAmount > 0 && numericAmount > numericBalance;
  const amountTooSmall = numericAmount > 0 && numericAmount < MIN_AMOUNT;
  const amountTooLarge = numericAmount > MAX_AMOUNT;

  const getAmountError = () => {
    if (amountTooSmall) return AMOUNT_TOO_SMALL;
    if (amountTooLarge) return AMOUNT_TOO_LARGE;
    if (insufficientBalance) return `${INSUFFICIENT_BALANCE}. You have $${numericBalance.toFixed(2)}.`;
    return null;
  };

  const error = getAmountError();

  return (
    <div>
      <label htmlFor="amount-input" className="block text-white/60 text-sm mb-2 font-medium">How much?</label>
      <div className="relative">
        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
        <input
          id="amount-input"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          min="0"
          aria-label="Payment amount in USD"
          aria-invalid={!!error}
          aria-describedby={error ? 'amount-error' : undefined}
          className="clay-input w-full pl-14 pr-16 text-3xl font-bold"
          disabled={disabled}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-medium text-sm">USD</span>
      </div>
      {/* Quick amount buttons */}
      <div className="flex flex-wrap gap-2 mt-3">
        {[5, 10, 25, 50, 100].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => { setAmount(amt.toString()); playSound('tap'); }}
            className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all flex-1 min-w-[72px] ${amount === amt.toString() ? "bg-plenmo-500 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            ${amt}
          </button>
        ))}
      </div>
      {error && (
        <div id="amount-error" className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl px-4 py-3 text-sm mt-3" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          {insufficientBalance && onFundWallet && (
            <button type="button" onClick={onFundWallet} className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 mt-2">
              <Wallet className="w-3 h-3" />
              Add funds to your wallet
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---

export function ImprovedSendMoneyForm({
  wallet,
  balance,
  contacts = [],
  contactsLoading = false,
  selectedContact,
  onSuccess,
  onFundWallet,
  onClearSelectedContact,
}: SendMoneyFormProps) {
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const [paymentState, dispatch] = useReducer(paymentFlowReducer, initialState);
  const { status, error, txHash, claimUrl, showConfirmation, showSuccess } = paymentState;

  // Effect to handle pre-selected contact from another component/page
  useEffect(() => {
    if (selectedContact) {
      const identifier = selectedContact.contactAddress || selectedContact.email || selectedContact.phone;
      if (identifier) {
        setRecipient(identifier);
        setRecipientName(selectedContact.name);
      }
    }
  }, [selectedContact]);

  const handleSelectContact = useCallback((contact: Contact) => {
    const identifier = contact.contactAddress || contact.email || contact.phone;
    if (identifier) {
      setRecipient(identifier);
      setRecipientName(contact.name);
      playSound('tap');
    }
  }, []);

  const handleRecipientChange = (value: string) => {
    setRecipient(value);
    if (recipientName) {
      setRecipientName(null);
      onClearSelectedContact?.();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !recipient || !amount) return;
    dispatch({ type: 'START_SEND' });
  };

  const handleConfirmSend = async () => {
    if (!wallet || status !== 'idle') return; // Prevent re-triggering while a send is in progress

    dispatch({ type: 'CONFIRM' });

    try {
      const result = await sendMoney(wallet, { recipientIdentifier: recipient, amount });
      if (result.success) {
        dispatch({ type: 'SEND_SUCCESS', payload: { txHash: result.txHash, claimUrl: result.claimUrl } });
        onSuccess?.(result.txHash, recipient);
      } else {
        // The 'sendMoney' function should ideally return a user-friendly error
        dispatch({ type: 'SEND_ERROR', payload: { error: result.error || "Payment failed. Please try again." } });
      }
    } catch (err) {
      dispatch({ type: 'SEND_ERROR', payload: { error: "An unexpected error occurred." } });
    }
  };

  const handleReset = () => {
    setRecipient("");
    setRecipientName(null);
    setAmount("");
    dispatch({ type: 'RESET' });
    onClearSelectedContact?.();
  };

  const isValidRecipient = recipient.includes("@") || /^\+?\d{10,}$/.test(recipient) || /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const canSubmit = wallet && isValidRecipient && parseFloat(amount) > MIN_AMOUNT && status !== 'signing' && status !== 'submitting';

  return (
    <>
      <form onSubmit={handleFormSubmit} className="clay-card p-6 space-y-5" aria-busy={status === 'signing' || status === 'submitting'}>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-heading">
          <Zap className="w-5 h-5 text-plenmo-500" />
          Send Money
        </h2>

        {contactsLoading ? (
          <ContactSkeleton />
        ) : (contacts.length > 0 && !recipient) && (
          <RecentContacts contacts={contacts} onSelect={handleSelectContact} limit={5} />
        )}

        {/* Recipient Input */}
        <div>
          <label className="block text-white/60 text-sm mb-2 font-medium">Who are you paying?</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              id="recipient-input"
              type="text"
              value={recipientName || recipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              placeholder="Email, phone, or wallet address"
              aria-label="Recipient email, phone, or wallet address"
              aria-invalid={recipient && !isValidRecipient && !recipientName}
              aria-describedby={recipient && !isValidRecipient && !recipientName ? 'recipient-error' : undefined}
              className="clay-input w-full pl-12"
              disabled={status !== 'idle'}
            />
            {recipient && isValidRecipient && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />}
          </div>
          {recipient && !isValidRecipient && !recipientName && (
            <p id="recipient-error" className="text-amber-400 text-xs mt-2 flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3" />
              Enter a valid email, phone, or wallet address
            </p>
          )}
        </div>

        {/* Amount Input - Refactored into its own component */}
        <AmountInput 
          amount={amount} 
          setAmount={setAmount} 
          balance={balance} 
          onFundWallet={onFundWallet}
          disabled={status !== 'idle'}
        />

        {/* General Error Display */}
        {error && status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full clay-button clay-button-primary py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {amount && parseFloat(amount) > 0 ? `Review $${parseFloat(amount).toFixed(2)} Payment` : "Review Payment"}
        </button>
      </form>

      {/* Confirmation and Progress Modal */}
      <MemoizedConfirmationModal
        isOpen={showConfirmation}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onConfirm={handleConfirmSend}
        loading={status === 'signing' || status === 'submitting'}
        recipient={recipientName || recipient}
        amount={amount}
        paymentStatus={status}
        paymentError={error}
        paymentTxHash={txHash}
        onRetry={handleConfirmSend}
      />

      {/* Success Overlay */}
      <MemoizedSuccessOverlay
        isVisible={showSuccess}
        amount={amount}
        recipient={recipientName || recipient}
        txHash={txHash}
        claimUrl={claimUrl}
        onClose={handleReset}
      />
    </>
  );
}

