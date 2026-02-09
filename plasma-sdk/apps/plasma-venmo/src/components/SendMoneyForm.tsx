"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  Send,
  User,
  DollarSign,
  AlertCircle,
  Wallet,
  CheckCircle,
  Zap,
} from "lucide-react";
import type { PlasmaEmbeddedWallet } from "@plasma-pay/privy-auth";
import {
  useAssistantReaction,
  getUserFriendlyError,
  PaymentProgress,
  type PaymentStatus,
} from "@plasma-pay/ui";
import { sendMoney, calculateRelayFee } from "@/lib/send";
import { parseUnits, formatUnits } from "viem";
import {
  MIN_AMOUNT,
  MAX_AMOUNT,
  AMOUNT_TOO_SMALL,
  AMOUNT_TOO_LARGE,
  INSUFFICIENT_BALANCE,
  RELAY_FEE_BPS,
} from "@/lib/constants";
import { playSound, hapticFeedback } from "@/lib/sounds";
import { RecentContacts } from "./RecentContacts";
import { ModalPortal } from "./ui/ModalPortal";
import { useToast } from "./ui/Toast";
import type { Contact } from "./ContactList";

interface SendMoneyFormProps {
  wallet: PlasmaEmbeddedWallet | null;
  balance?: string;
  onSuccess?: () => void;
  onFundWallet?: () => void;
  contacts?: Contact[];
  contactsLoading?: boolean;
  onPaymentSuccess?: (recipientAddress: string) => void;
  selectedContact?: Contact | null;
  onClearSelectedContact?: () => void;
}

// Memoized confirmation modal for better performance
const ConfirmationModal = memo(function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  recipient,
  amount,
  paymentStatus,
  paymentError,
  paymentTxHash,
  onRetry,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  recipient: string;
  amount: string;
  paymentStatus: PaymentStatus;
  paymentError: string | null;
  paymentTxHash: string | undefined;
  onRetry: () => void;
}) {
  if (!isOpen) return null;

  // If we're in progress or completed, show PaymentProgress
  if (loading || paymentStatus !== "idle") {
    return (
      <ModalPortal
        isOpen={isOpen}
        onClose={onClose}
        closeOnBackdrop={paymentStatus === "error"}
        zIndex={110}
        wrapperClassName="max-w-md"
      >
        <PaymentProgress
          status={paymentStatus}
          txHash={paymentTxHash}
          error={paymentError || undefined}
          retryable={true}
          onRetry={onRetry}
          onClose={onClose}
          recipient={recipient}
          amount={amount}
        />
      </ModalPortal>
    );
  }

  // Otherwise show the confirmation modal
  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={!loading}
      zIndex={110}
      wrapperClassName="max-w-sm"
    >
      <div className="clay-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 text-center">
          Confirm Payment
        </h3>

        <div className="text-center mb-6">
          <p className="text-white/50 text-sm mb-1">Sending</p>
          <p className="text-4xl font-bold gradient-text">${amount}</p>
          <p className="text-white/40 text-sm">USD</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <p className="text-white/50 text-sm mb-1">To</p>
          <p className="text-white font-medium break-all">{recipient}</p>
        </div>

        {(() => {
          const parsedAmt = parseFloat(amount);
          if (parsedAmt > 0) {
            const units = parseUnits(amount, 6);
            const fee = calculateRelayFee(units);
            const net = units - fee;
            const feeStr = formatUnits(fee, 6);
            const netStr = formatUnits(net, 6);
            return (
              <div className="flex flex-col gap-1 text-sm mb-6 px-2">
                <div className="flex justify-between">
                  <span className="text-white/50">Amount</span>
                  <span className="text-white font-medium">${amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">
                    Fee ({RELAY_FEE_BPS / 100}%)
                  </span>
                  <span className="text-amber-400 font-medium">
                    -${parseFloat(feeStr).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                  <span className="text-white/50">They receive</span>
                  <span className="text-green-400 font-medium">
                    ${parseFloat(netStr).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="flex items-start gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Payments are final and cannot be reversed.</span>
        </div>

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
            className="flex-1 py-3 px-4 rounded-2xl clay-button clay-button-primary disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </ModalPortal>
  );
});

// Memoized success overlay
const SuccessOverlay = memo(function SuccessOverlay({
  isVisible,
  amount,
  recipient,
  txHash,
  claimUrl,
  onClose,
  onSendAgain,
}: {
  isVisible: boolean;
  amount: string;
  recipient: string;
  txHash?: string;
  claimUrl?: string;
  onClose: () => void;
  onSendAgain?: () => void;
}) {
  const toast = useToast();

  if (!isVisible) return null;

  const isClaimFlow = !!claimUrl;

  const handleCopyClaimLink = async () => {
    if (claimUrl) {
      await navigator.clipboard.writeText(claimUrl);
      toast.success("Claim link copied to clipboard!");
    }
  };

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
        {/* Reduced confetti for better performance - 20 instead of 50 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-confetti-fall"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: [
                  "#1DB954",
                  "#3dd88a",
                  "#22c55e",
                  "#f59e0b",
                  "#8b5cf6",
                ][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className="clay-card p-8 text-center animate-success-bounce max-w-sm mx-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <p className="text-4xl font-bold gradient-text mb-2">${amount}</p>
          <p className="text-lg text-white/60 mb-1">
            {isClaimFlow ? "pending for" : "sent to"}
          </p>
          <p className="text-plenmo-500 font-medium mb-6 break-all">
            {recipient}
          </p>

          {isClaimFlow ? (
            <div className="text-center mb-6">
              <p className="text-white/50 text-sm mb-3">
                They&apos;ll receive an email to claim the funds
              </p>
              <button
                onClick={handleCopyClaimLink}
                className="text-plenmo-500 text-sm hover:underline"
              >
                Copy claim link
              </button>
            </div>
          ) : (
            txHash && (
              <a
                href={`https://scan.plasma.to/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-plenmo-500 text-sm hover:underline mb-6 block"
              >
                View transaction →
              </a>
            )
          )}

          <div className="flex gap-3">
            {onSendAgain && (
              <button
                onClick={onSendAgain}
                className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Send Again
              </button>
            )}
            <button
              onClick={onClose}
              className={`clay-button clay-button-primary py-3 ${
                onSendAgain ? "flex-1" : "w-full"
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
});

export function SendMoneyForm({
  wallet,
  balance,
  onSuccess,
  onFundWallet,
  contacts = [],
  contactsLoading = false,
  onPaymentSuccess,
  selectedContact,
  onClearSelectedContact,
}: SendMoneyFormProps) {
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();
  const {
    onSuccess: assistantSuccess,
    onError: assistantError,
    onLoading: assistantLoading,
  } = useAssistantReaction();

  // Refs for cleanup and preventing double-submit
  const isSubmittingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Payment progress state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | undefined>();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | undefined>();
  const [successClaimUrl, setSuccessClaimUrl] = useState<string | undefined>();
  const [lastRecipient, setLastRecipient] = useState<string>("");

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle selectedContact changes properly with useEffect
  useEffect(() => {
    if (selectedContact) {
      const contactIdentifier =
        selectedContact.contactAddress ||
        selectedContact.email ||
        selectedContact.phone;
      if (contactIdentifier) {
        setRecipient(contactIdentifier);
        setRecipientName(selectedContact.name);
      }
    }
  }, [selectedContact]);

  const handleSelectContact = useCallback((contact: Contact) => {
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
    playSound("tap");
  }, []);

  const handleRecipientChange = useCallback(
    (value: string) => {
      setRecipient(value);
      if (recipientName && value !== recipient) {
        setRecipientName(null);
        // Clear selected contact when user manually edits the recipient
        if (onClearSelectedContact) {
          onClearSelectedContact();
        }
      }
    },
    [recipientName, recipient, onClearSelectedContact]
  );

  const numericBalance = parseFloat(balance || "0");
  const numericAmount = parseFloat(amount || "0");
  const insufficientBalance =
    numericAmount > 0 && numericAmount > numericBalance;
  const amountTooSmall = numericAmount > 0 && numericAmount < MIN_AMOUNT;
  const amountTooLarge = numericAmount > MAX_AMOUNT;

  const getAmountError = useCallback((): string | null => {
    if (amountTooSmall) return AMOUNT_TOO_SMALL;
    if (amountTooLarge) return AMOUNT_TOO_LARGE;
    if (insufficientBalance)
      return `${INSUFFICIENT_BALANCE}. You have $${numericBalance.toFixed(2)}.`;
    return null;
  }, [amountTooSmall, amountTooLarge, insufficientBalance, numericBalance]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet || !recipient || !amount) return;

      const amountError = getAmountError();
      if (amountError) {
        setError(amountError);
        return;
      }

      setError(null);
      setShowConfirm(true);
    },
    [wallet, recipient, amount, getAmountError]
  );

  const handleConfirmSend = useCallback(async () => {
    // Use ref to prevent double-submit (race condition protection)
    if (!wallet || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setLoading(true);
    setError(null);
    setPaymentError(null);
    setPaymentStatus("signing");
    assistantLoading();

    try {
      // Update to submitting state
      setPaymentStatus("submitting");

      const result = await sendMoney(wallet, {
        recipientIdentifier: recipient,
        amount,
      });

      if (result.success) {
        // Move to confirming state
        setPaymentStatus("confirming");
        setPaymentTxHash(result.txHash);

        // Store last recipient for "Send Again" feature
        setLastRecipient(recipientName || recipient);

        // After a brief confirmation period, mark as complete
        timeoutRef.current = setTimeout(() => {
          setPaymentStatus("complete");
          setShowConfirm(false);
          setSuccessTxHash(result.txHash);
          setSuccessClaimUrl(result.claimUrl);
          setShowSuccess(true);

          playSound("success");
          hapticFeedback("medium");
          assistantSuccess(`Payment of $${amount} sent!`);

          if (onPaymentSuccess && /^0x[a-fA-F0-9]{40}$/.test(recipient)) {
            onPaymentSuccess(recipient);
          }
        }, 1000);
      } else {
        // Handle unsuccessful result
        const errorMessage =
          result.error || "Payment failed. Please try again.";
        setPaymentStatus("error");
        setPaymentError(getUserFriendlyError(errorMessage));
        playSound("error");
        hapticFeedback("light");
        assistantError(getUserFriendlyError(errorMessage));
      }
    } catch (err) {
      // Handle exceptions
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setPaymentStatus("error");
      setPaymentError(getUserFriendlyError(errorMessage));
      playSound("error");
      hapticFeedback("light");
      assistantError("Something went wrong. Your funds are safe!");
      console.error("Payment error:", err);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [
    wallet,
    recipient,
    amount,
    recipientName,
    assistantLoading,
    assistantSuccess,
    assistantError,
    onPaymentSuccess,
  ]);

  const handleRetry = useCallback(() => {
    // Reset payment state and retry
    setPaymentError(null);
    setPaymentStatus("idle");
    handleConfirmSend();
  }, [handleConfirmSend]);

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
    setRecipient("");
    setRecipientName(null);
    setAmount("");
    setSuccessTxHash(undefined);
    setSuccessClaimUrl(undefined);
    setPaymentStatus("idle");
    setPaymentError(null);
    setPaymentTxHash(undefined);
    onSuccess?.();
  }, [onSuccess]);

  const handleSendAgain = useCallback(() => {
    setShowSuccess(false);
    // Keep recipient, clear amount
    setAmount("");
    setSuccessTxHash(undefined);
    setSuccessClaimUrl(undefined);
    setPaymentStatus("idle");
    setPaymentError(null);
    setPaymentTxHash(undefined);
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const isValidRecipient =
    recipient.includes("@") ||
    /^\+?\d{10,}$/.test(recipient) ||
    /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const isValidAmount = parseFloat(amount) > 0;
  const hasValidationError =
    insufficientBalance || amountTooSmall || amountTooLarge;
  const canSubmit =
    wallet &&
    isValidRecipient &&
    isValidAmount &&
    !loading &&
    !hasValidationError;

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="clay-card p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 font-heading">
          <Zap className="w-5 h-5 text-plenmo-500" />
          Send Money
        </h2>

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
              id="recipient-input"
              type="text"
              value={recipientName || recipient}
              onChange={(e) => handleRecipientChange(e.target.value)}
              placeholder="Email, phone, or wallet address"
              aria-label="Recipient email, phone, or wallet address"
              aria-invalid={
                recipient && !isValidRecipient && !recipientName ? true : false
              }
              aria-describedby={
                recipient && !isValidRecipient && !recipientName
                  ? "recipient-error"
                  : undefined
              }
              className={`clay-input w-full pl-12 ${
                recipient && !isValidRecipient && !recipientName
                  ? "border-amber-500/50"
                  : ""
              }`}
              disabled={loading}
            />
            {recipient && isValidRecipient && (
              <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
            )}
          </div>
          {recipientName && (
            <p className="text-plenmo-500 text-xs mt-2">
              Sending to {recipientName}
            </p>
          )}
          {recipient && !isValidRecipient && !recipientName && (
            <p
              id="recipient-error"
              className="text-amber-400 text-xs mt-2 flex items-center gap-1"
              role="alert"
            >
              <AlertCircle className="w-3 h-3" />
              Enter a valid email, phone, or wallet address
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="amount-input"
            className="block text-white/60 text-sm mb-2 font-medium"
          >
            How much?
          </label>
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
              aria-invalid={
                amountTooSmall || amountTooLarge || insufficientBalance
              }
              aria-describedby={
                amountTooSmall || amountTooLarge || insufficientBalance
                  ? "amount-error"
                  : undefined
              }
              className={`clay-input w-full pl-14 pr-16 text-3xl font-bold ${
                amountTooSmall || amountTooLarge || insufficientBalance
                  ? "border-amber-500/50"
                  : ""
              }`}
              disabled={loading}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-medium text-sm">
              USD
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { amt: 5, emoji: "☕" },
              { amt: 10, emoji: "🍕" },
              { amt: 25, emoji: "🎬" },
              { amt: 50, emoji: "🎁" },
              { amt: 100, emoji: "🎉" },
            ].map(({ amt, emoji }) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setAmount(amt.toString());
                  playSound("tap");
                }}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all flex-1 min-w-[72px] flex flex-col items-center justify-center ${
                  amount === amt.toString()
                    ? "bg-plenmo-500 text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <span className="block text-base mb-0.5">{emoji}</span>${amt}
              </button>
            ))}
          </div>
        </div>

        {(insufficientBalance || amountTooSmall || amountTooLarge) &&
          !error && (
            <div
              id="amount-error"
              className="bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl px-4 py-3 text-sm"
              role="alert"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {amountTooSmall && AMOUNT_TOO_SMALL}
                  {amountTooLarge && AMOUNT_TOO_LARGE}
                  {insufficientBalance &&
                    !amountTooSmall &&
                    !amountTooLarge &&
                    `Insufficient balance (${numericBalance.toFixed(
                      2
                    )} available)`}
                </span>
              </div>
              {insufficientBalance &&
                onFundWallet &&
                !amountTooSmall &&
                !amountTooLarge && (
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
          <div
            className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full clay-button clay-button-primary py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {amount && parseFloat(amount) > 0
            ? `Review $${parseFloat(amount).toFixed(2)} Payment`
            : "Review Payment"}
        </button>

        <div className="flex items-center justify-center gap-4 pt-1">
          <p className="text-white/40 text-xs flex items-center gap-1.5 font-body">
            <span className="w-1.5 h-1.5 rounded-full bg-plenmo-500" />
            0.5% network fee
          </p>
          <p className="text-white/40 text-xs flex items-center gap-1.5 font-body">
            <Zap className="w-3 h-3 text-plenmo-400" />
            Instant delivery
          </p>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => {
          if (!loading && paymentStatus === "idle") {
            setShowConfirm(false);
          }
        }}
        onConfirm={handleConfirmSend}
        loading={loading}
        recipient={recipientName || recipient}
        amount={amount}
        paymentStatus={paymentStatus}
        paymentError={paymentError}
        paymentTxHash={paymentTxHash}
        onRetry={handleRetry}
      />

      <SuccessOverlay
        isVisible={showSuccess}
        amount={amount}
        recipient={recipientName || recipient}
        txHash={successTxHash}
        claimUrl={successClaimUrl}
        onClose={handleSuccessClose}
        onSendAgain={handleSendAgain}
      />

      {/* Aria live region for status updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {paymentStatus === "signing" && "Preparing payment..."}
        {paymentStatus === "submitting" && "Sending payment..."}
        {paymentStatus === "confirming" && "Confirming transaction..."}
        {paymentStatus === "complete" &&
          `Payment of $${amount} sent successfully!`}
        {paymentStatus === "error" && `Payment failed: ${paymentError}`}
      </div>
    </>
  );
}
