"use client";

/**
 * Bill Participant Payment Page
 *
 * Allows a participant to pay their share of a bill.
 * Includes balance checking and funding options if insufficient funds.
 *
 * User Stories:
 * 1. User with sufficient balance can pay immediately
 * 2. User with insufficient balance sees clear funding options
 * 3. User can buy crypto with card (MoonPay)
 * 4. User can transfer from external wallet (MetaMask, etc.)
 * 5. User can see their wallet address to receive funds manually
 * 6. User gets clear feedback at every step
 */

import { useState, useEffect, useCallback } from "react";
import {
  usePlasmaWallet,
  useUSDT0Balance,
  useFundWallet,
  useConnectExternalWallet,
} from "@plasma-pay/privy-auth";
import {
  PaymentProgress,
  type PaymentStatus,
  getErrorDetails,
} from "@plasma-pay/ui";
import { parseUnits } from "viem";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  Wallet,
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  QrCode,
  ArrowRightLeft,
  Info,
} from "lucide-react";
import {
  createTransferParams,
  buildTransferAuthorizationTypedData,
} from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";

interface BillPayData {
  billId: string;
  billTitle: string;
  creatorAddress: string;
  participant: {
    id: string;
    name: string;
    share: number;
    paid: boolean;
    txHash?: string;
  };
}

// Helper to split signature
function splitSignature(signature: `0x${string}`): {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
} {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

export default function BillPayPage({
  params,
}: {
  params: { id: string; participantId: string };
}) {
  // Extract route params (Next.js 14 synchronous pattern)
  const billId = params.id;
  const participantId = params.participantId;

  // Wallet state
  const { authenticated, ready, wallet, login } = usePlasmaWallet();
  const {
    formatted: balanceFormatted,
    loading: balanceLoading,
    refresh: refreshBalance,
  } = useUSDT0Balance();
  const { fundWallet } = useFundWallet();
  const { connectWallet: connectExternalWallet } = useConnectExternalWallet();

  // Page state
  const [payData, setPayData] = useState<BillPayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFundingOptions, setShowFundingOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fundingInProgress, setFundingInProgress] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  // Payment progress state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentTxHash, setPaymentTxHash] = useState<string | undefined>();
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Calculate if user has sufficient balance (handle NaN edge case)
  const numericBalance = balanceFormatted ? parseFloat(balanceFormatted) : 0;
  const safeBalance = isNaN(numericBalance) ? 0 : numericBalance;
  const requiredAmount = payData?.participant.share ?? 0;
  // User needs MORE funds if balance is strictly less than required (equal is OK)
  const hasInsufficientFunds = authenticated && safeBalance < requiredAmount;
  const shortfall = Math.max(0, requiredAmount - safeBalance);

  // Format balance with appropriate precision
  const formatBalance = (bal: number): string => {
    if (bal === 0) return "0.00";
    if (bal < 0.01) return bal.toFixed(6); // Show more decimals for tiny amounts
    return bal.toFixed(2);
  };

  // Copy address helper with better feedback
  const copyAddress = useCallback(async () => {
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = wallet.address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }, [wallet?.address]);

  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Fetch bill and participant data
  useEffect(() => {
    if (!billId || !participantId) return;

    async function fetchData() {
      try {
        const response = await fetch(`/api/bills/${billId}`);
        if (!response.ok) {
          setError("Bill not found");
          setLoading(false);
          return;
        }

        const data = await response.json();
        const participants = (data.bill?.participants ?? []) as Array<
          BillPayData["participant"]
        >;
        const participant = participants.find((p) => p.id === participantId);

        if (!participant) {
          setError("Participant not found");
          setLoading(false);
          return;
        }

        setPayData({
          billId: data.bill.id,
          billTitle: data.bill.title,
          creatorAddress: data.bill.creatorAddress,
          participant: {
            id: participant.id,
            name: participant.name,
            share: participant.share,
            paid: participant.paid,
            txHash: participant.txHash,
          },
        });
      } catch {
        setError("Failed to load bill");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [billId, participantId]);

  // Handle payment
  async function handlePay() {
    if (!wallet || !payData) return;

    // Check balance before attempting payment
    if (hasInsufficientFunds) {
      setError(
        `Insufficient balance. You have $${numericBalance.toFixed(
          2
        )} but need $${requiredAmount.toFixed(2)}`
      );
      setShowFundingOptions(true);
      return;
    }

    setPaying(true);
    setError(null);
    setPaymentError(null);
    setPaymentStatus("signing");

    try {
      // Parse amount
      const amountInUnits = parseUnits(payData.participant.share.toString(), 6);

      // Create transfer params
      const params = createTransferParams(
        wallet.address,
        payData.creatorAddress as `0x${string}`,
        amountInUnits
      );

      // Build typed data
      const typedData = buildTransferAuthorizationTypedData(params, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      // Update to submitting state
      setPaymentStatus("submitting");

      // Sign
      const signature = await wallet.signTypedData(typedData);
      const { v, r, s } = splitSignature(signature);

      // Submit to API
      const response = await fetch(
        `/api/bills/${billId}/pay/${participantId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: params.from,
            to: params.to,
            value: params.value.toString(),
            validAfter: params.validAfter,
            validBefore: params.validBefore,
            nonce: params.nonce,
            v,
            r,
            s,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment failed");
      }

      // Move to confirming state
      setPaymentStatus("confirming");
      setPaymentTxHash(result.txHash);

      // After a brief confirmation period, mark as complete
      setTimeout(() => {
        setPaymentStatus("complete");
        setSuccess(result.txHash);
        setPayData((prev) =>
          prev
            ? {
                ...prev,
                participant: {
                  ...prev.participant,
                  paid: true,
                  txHash: result.txHash,
                },
              }
            : null
        );
      }, 1000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error occurred";
      setPaymentError(
        getPaymentErrorMessage(errorMsg, requiredAmount, safeBalance)
      );
      setPaymentStatus("error");
      setShowFundingOptions(true);
      refreshBalance();
    } finally {
      setPaying(false);
    }
  }

  // Helper to get payment error messages
  function getPaymentErrorMessage(
    errorMsg: string,
    requiredAmount: number,
    currentBalance: number
  ): string {
    if (
      errorMsg.includes("exceeds balance") ||
      errorMsg.includes("insufficient") ||
      errorMsg.includes("ERC20")
    ) {
      return `Your wallet doesn't have enough USDT0 to complete this payment. You need $${(
        requiredAmount - currentBalance
      ).toFixed(2)} more.`;
    } else if (errorMsg.includes("rejected") || errorMsg.includes("denied")) {
      return "Transaction was cancelled. Please try again.";
    } else if (
      errorMsg.includes("network") ||
      errorMsg.includes("connection")
    ) {
      return "Network error. Please check your connection and try again.";
    }
    return `Payment failed: ${errorMsg}`;
  }

  // Retry payment
  function handleRetryPayment() {
    setPaymentError(null);
    setPaymentStatus("idle");
    handlePay();
  }

  // Handle funding wallet with loading state and error handling
  async function handleFundWallet(
    method?: "card" | "exchange" | "wallet" | "manual"
  ) {
    setFundingInProgress(true);
    setError(null);

    try {
      // Calculate amount needed (shortfall + small buffer for any fees)
      const amountNeeded = Math.max(shortfall + 0.01, 1).toFixed(2);

      const fundParams: Parameters<typeof fundWallet>[0] = method
        ? { amount: amountNeeded, method }
        : { amount: amountNeeded };

      await fundWallet(fundParams);

      // Refresh balance after a delay to allow transaction to process
      setTimeout(() => {
        refreshBalance();
        setFundingInProgress(false);
      }, 3000);
    } catch (err) {
      setFundingInProgress(false);
      const { message, category } = getErrorDetails(err, {
        operation: "funding",
      });
      // Only show error if not user cancelled
      if (category !== "user_rejected") {
        setError(message);
      }
      console.error("Funding error:", err);
    }
  }

  // Retry payment after funding
  function handleRetryAfterFunding() {
    setShowFundingOptions(false);
    setError(null);
    refreshBalance();
  }

  // Loading
  if (loading || !ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin" />
      </main>
    );
  }

  // Error
  if (error && !payData) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-[rgb(0,212,255)] hover:underline">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  if (!payData) return null;

  // Already paid / success
  if (payData.participant.paid || success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="p-8 rounded-3xl bg-white/5">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Payment Complete!
            </h1>
            <p className="text-4xl font-bold gradient-text my-4">
              ${payData.participant.share.toFixed(2)}
            </p>
            <p className="text-white/50 mb-6">for {payData.billTitle}</p>

            {(success || payData.participant.txHash) && (
              <a
                href={`https://scan.plasma.to/tx/${
                  success || payData.participant.txHash
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline"
              >
                View transaction
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <div className="mt-6">
              <Link
                href={`/bill/${billId}`}
                className="text-white/50 hover:text-white"
              >
                ← Back to bill
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Payment UI
  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="flex items-center gap-4 mb-6">
        <Link
          href={`/bill/${billId}`}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <h1 className="text-xl font-semibold text-white">Pay Your Share</h1>
      </header>

      <div className="max-w-md mx-auto space-y-4">
        {/* Payment Amount Card */}
        <div className="p-8 rounded-3xl bg-white/5 text-center">
          <p className="text-white/50 mb-2">{payData.billTitle}</p>
          <p className="text-white/70 text-lg mb-4">
            Hi{" "}
            <span className="font-bold text-white">
              {payData.participant.name}
            </span>
            !
          </p>

          <p className="text-white/50 mb-2">Your share</p>
          <p className="text-5xl font-bold gradient-text mb-6">
            ${payData.participant.share.toFixed(2)}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-4">
              {error}
            </div>
          )}

          {!authenticated ? (
            <div className="space-y-4">
              <button onClick={login} className="w-full btn-primary">
                Connect Wallet to Pay
              </button>
              <p className="text-white/40 text-xs">
                Sign in with email, Google, or connect an existing wallet like
                MetaMask
              </p>
            </div>
          ) : (
            <>
              {/* Wallet Info Section */}
              <div
                className={`p-4 rounded-xl mb-4 ${
                  hasInsufficientFunds
                    ? "bg-red-500/10 border border-red-500/30"
                    : "bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                      <Wallet className="w-3 h-3 text-white" />
                    </div>
                    <div className="relative">
                      <button
                        onClick={copyAddress}
                        onMouseEnter={() => setShowTooltip("address")}
                        onMouseLeave={() => setShowTooltip(null)}
                        className="text-white/70 text-sm font-mono hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                        title="Click to copy full address"
                        aria-label="Copy wallet address"
                      >
                        {shortenAddress(wallet?.address || "")}
                        {copied ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <Check className="w-3 h-3" />
                            Copied!
                          </span>
                        ) : (
                          <Copy className="w-3 h-3 text-white/40" />
                        )}
                      </button>
                      {showTooltip === "address" && !copied && (
                        <div className="absolute left-0 -bottom-8 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                          Click to copy address
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => refreshBalance()}
                    disabled={balanceLoading}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors group"
                    title="Refresh balance"
                    aria-label="Refresh wallet balance"
                    aria-live="polite"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-white/40 group-hover:text-white/70 ${
                        balanceLoading ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-white/50 text-sm">
                      Available Balance
                    </span>
                    <div
                      className="relative"
                      onMouseEnter={() => setShowTooltip("balance")}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <HelpCircle className="w-3 h-3 text-white/30 cursor-help" />
                      {showTooltip === "balance" && (
                        <div className="absolute left-0 -bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded w-48 z-10">
                          USDT0 is a stablecoin worth $1 USD on Plasma Chain
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`font-bold text-lg ${
                      hasInsufficientFunds ? "text-red-400" : "text-white"
                    }`}
                  >
                    {balanceLoading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </span>
                    ) : (
                      `$${formatBalance(safeBalance)}`
                    )}
                  </span>
                </div>

                {hasInsufficientFunds && (
                  <div className="mt-3 p-2 bg-red-500/10 rounded-lg">
                    <p className="text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        You need <strong>${shortfall.toFixed(2)}</strong> more
                        to pay this bill
                      </span>
                    </p>
                  </div>
                )}

                {!hasInsufficientFunds && safeBalance > 0 && (
                  <div className="mt-2">
                    <p className="text-green-400/70 text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Sufficient balance for this payment
                    </p>
                  </div>
                )}
              </div>

              {/* Payment / Fund Buttons */}
              {hasInsufficientFunds || showFundingOptions ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white/70 text-sm font-medium">
                      Choose how to add funds:
                    </p>
                    {showFundingOptions && !hasInsufficientFunds && (
                      <button
                        onClick={handleRetryAfterFunding}
                        className="text-cyan-400 text-sm hover:underline"
                      >
                        Back to payment
                      </button>
                    )}
                  </div>

                  {/* Recommended: Buy with Card */}
                  <button
                    onClick={() => handleFundWallet("card")}
                    disabled={fundingInProgress}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 hover:border-cyan-400 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">Buy with Card</p>
                        <span className="text-[10px] bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      </div>
                      <p className="text-white/50 text-xs">
                        Visa, Mastercard, Apple Pay via MoonPay
                      </p>
                    </div>
                    {fundingInProgress && (
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    )}
                  </button>

                  {/* Transfer from external wallet */}
                  <button
                    onClick={() => handleFundWallet("wallet")}
                    disabled={fundingInProgress}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <ArrowRightLeft className="w-5 h-5 text-white/70" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-medium">
                        Transfer from Another Wallet
                      </p>
                      <p className="text-white/50 text-xs">
                        Bridge USDT from MetaMask, Rabby, Phantom
                      </p>
                    </div>
                  </button>

                  {/* Show QR / Manual */}
                  <button
                    onClick={() => handleFundWallet("manual")}
                    disabled={fundingInProgress}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-white/70" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-white font-medium">
                        Receive via QR Code
                      </p>
                      <p className="text-white/50 text-xs">
                        Show address to receive USDT0 from anyone
                      </p>
                    </div>
                  </button>

                  <div className="pt-2 border-t border-white/10">
                    <button
                      onClick={() => connectExternalWallet()}
                      className="w-full text-white/50 hover:text-cyan-400 text-sm py-2 transition-colors flex items-center justify-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Connect a wallet with existing funds
                    </button>
                  </div>

                  {/* Helpful tip */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mt-2">
                    <p className="text-blue-300/80 text-xs flex items-start gap-2">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        After adding funds, click &quot;Back to payment&quot; or
                        wait for your balance to update automatically.
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentStatus !== "idle" ? (
                    // Show PaymentProgress when payment is in progress
                    <PaymentProgress
                      status={paymentStatus}
                      txHash={paymentTxHash}
                      error={paymentError || undefined}
                      retryable={true}
                      onRetry={handleRetryPayment}
                      onClose={() => {
                        if (
                          paymentStatus === "complete" ||
                          paymentStatus === "error"
                        ) {
                          setPaymentStatus("idle");
                          setPaymentError(null);
                          setPaymentTxHash(undefined);
                        }
                      }}
                      recipient={payData.billTitle}
                      amount={payData.participant.share.toFixed(2)}
                    />
                  ) : (
                    <button
                      onClick={handlePay}
                      disabled={paying || balanceLoading}
                      className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 py-4 text-lg"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Confirming payment...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Pay ${payData.participant.share.toFixed(2)}
                        </>
                      )}
                    </button>
                  )}

                  {/* Optional: Add more funds button */}
                  {paymentStatus === "idle" && (
                    <button
                      onClick={() => setShowFundingOptions(true)}
                      className="w-full text-white/40 hover:text-white/60 text-xs py-1 transition-colors"
                    >
                      Need to add more funds?
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer info */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-center gap-4 text-white/30 text-xs">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-400/50" />
                Zero gas fees
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-400/50" />
                Instant settlement
              </span>
            </div>
            <p className="text-white/20 text-[10px] text-center mt-2">
              Powered by Plasma Chain
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
