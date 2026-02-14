"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Loader2, AlertCircle, ArrowRight, Wallet, LogIn } from "lucide-react";
import { usePlasmaWallet, useUSDT0Balance, useFundWallet } from "@plasma-pay/privy-auth";
import { getErrorDetails } from "@plasma-pay/ui";
import { usePredictionStore } from "@/lib/store";
import { usePlaceBet } from "@/hooks/useBets";
import { useDemoStore } from "@/lib/demo-store";
import { useBalance, formatBalance } from "@/hooks/useBalance";
import { OddsBar } from "./OddsBar";
import {
  parseUSDT,
  QUICK_AMOUNTS,
  USDT0_DECIMALS,
} from "@/lib/constants";

export function BettingModal() {
  const { bettingModal, closeBettingModal, slippage } = usePredictionStore();
  const { isOpen, market, outcome: initialOutcome } = bettingModal;
  const { authenticated, login, ready: walletReady } = usePlasmaWallet();
  const { balance: walletBalance, refresh: refreshBalance, loading: balanceLoading } = useUSDT0Balance();
  const placeBetMutation = usePlaceBet();
  const { fundWallet, ready: fundReady } = useFundWallet();
  
  // Demo mode
  const { isDemoMode, demoBalance, placeDemoBet } = useDemoStore();
  
  // Mock balance for demo/unauthenticated
  const { balance: mockBalance, deductBalance } = useBalance();

  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "signing" | "submitting" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Determine if using real wallet or demo
  const isRealWallet = authenticated && !isDemoMode;
  
  // Sync outcome from modal open
  useEffect(() => {
    if (initialOutcome) {
      setOutcome(initialOutcome);
    }
  }, [initialOutcome]);
  
  // Focus trap for accessibility
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (step !== "signing" && step !== "submitting") {
        closeBettingModal();
        setAmount("");
        setStep("input");
        setErrorMsg("");
      }
      return;
    }
    if (e.key !== 'Tab') return;
    
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    if (!focusableElements || focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, [step, closeBettingModal]);

  const parsedAmount = useMemo(() => {
    const val = parseFloat(amount);
    return isNaN(val) ? 0 : val;
  }, [amount]);

  const amountAtomic = useMemo(() => {
    return parseUSDT(parsedAmount);
  }, [parsedAmount]);

  const balanceNum = useMemo(() => {
    if (isRealWallet && walletBalance !== null) {
      // Real wallet: convert from atomic (6 decimals) to number
      return Number(walletBalance) / 1e6;
    }
    if (isDemoMode) {
      return demoBalance;
    }
    // Use mock balance for demo feel
    return mockBalance;
  }, [isRealWallet, walletBalance, isDemoMode, demoBalance, mockBalance]);

  const shares = useMemo(() => {
    if (!market || !outcome || parsedAmount <= 0) return 0;
    const price = outcome === "YES" ? market.yesPrice : market.noPrice;
    return parsedAmount / price;
  }, [market, outcome, parsedAmount]);

  const potentialPayout = shares;
  const potentialProfit = potentialPayout - parsedAmount;
  const profitPercent = parsedAmount > 0 ? (potentialProfit / parsedAmount) * 100 : 0;

  const minAmountOut = useMemo(() => {
    const minShares = shares * (1 - slippage / 100);
    return BigInt(Math.floor(minShares * 10 ** USDT0_DECIMALS));
  }, [shares, slippage]);

  const canSubmit = parsedAmount >= 1 && parsedAmount <= balanceNum;

  const handleClose = () => {
    if (step === "signing" || step === "submitting") return;
    closeBettingModal();
    setAmount("");
    setStep("input");
    setErrorMsg("");
  };

  const handleSubmit = async () => {
    if (!canSubmit || !market) return;

    try {
      if (isRealWallet) {
        // Real wallet: Use EIP-3009 signing flow
        setStep("signing");
        
        await placeBetMutation.mutateAsync({
          marketId: market.id,
          outcome: outcome,
          amount: amountAtomic,
          minAmountOut: minAmountOut,
        });
        
        // Refresh balance after bet
        refreshBalance();
        setStep("success");
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        // Demo mode: Use mock balance
        setStep("submitting");
        
        // Simulate delay for UX
        await new Promise((r) => setTimeout(r, 800));
        
        // Use mock balance deduction
        const success = deductBalance(parsedAmount);
        
        if (!success) {
          throw new Error("Insufficient balance");
        }
        
        // If using real demo store
        if (isDemoMode) {
          placeDemoBet({
            market,
            outcome: outcome,
            amount: parsedAmount,
          });
        }
        
        setStep("success");
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (error: unknown) {
      setStep("error");
      const { message, recovery } = getErrorDetails(error, {
        operation: 'bet_placement',
        amount: parsedAmount,
        balance: balanceNum,
      });
      setErrorMsg(recovery ? `${message} ${recovery}` : message);
    }
  };

  if (!isOpen || !market) return null;

  const yesPercent = Math.round(market.yesPrice * 100);
  const isYes = outcome === "YES";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center"
        onClick={handleClose}
      >
        <motion.div
          ref={modalRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          className="bottom-sheet w-full sm:max-w-md p-6 safe-area-bottom"
          role="dialog"
          aria-modal="true"
          aria-labelledby="betting-modal-title"
        >
          {/* Drag Handle (mobile) */}
          <div className="flex justify-center mb-5 sm:hidden">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1">
              <h2 id="betting-modal-title" className="font-display text-lg font-bold text-white leading-snug line-clamp-2">
                {market.question}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-xl transition -mr-2 -mt-2"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>

          {/* Content based on step */}
          {step === "input" && (
            <>
              {/* Current Odds Display */}
              <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">Current Odds</p>
                <OddsBar yesPercent={yesPercent} size="md" />
              </div>

              {/* Yes/No Toggle */}
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setOutcome("YES")}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    isYes
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  YES · {yesPercent}%
                </button>
                <button
                  onClick={() => setOutcome("NO")}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    !isYes
                      ? "bg-gray-500/50 text-white shadow-lg shadow-gray-500/20"
                      : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  NO · {100 - yesPercent}%
                </button>
              </div>

              {/* Wallet Connection Banner */}
              {!authenticated && walletReady && (
                <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <LogIn className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Connect for real bets</p>
                      <p className="text-xs text-white/50">Currently in demo mode</p>
                    </div>
                    <button
                      onClick={login}
                      className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-semibold hover:bg-purple-400 transition"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/60">
                    Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-purple-400" />
                    {balanceLoading ? (
                      <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
                    ) : (
                      <span className="text-xs text-white/50">
                        {formatBalance(balanceNum)}
                        {isRealWallet && " USDT0"}
                      </span>
                    )}
                    <button
                      onClick={() => setAmount(balanceNum.toString())}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
                    >
                      Max
                    </button>
                    {isRealWallet && fundReady && (
                      <button
                        onClick={() => fundWallet()}
                        className="text-xs font-semibold text-green-400 hover:text-green-300 transition"
                      >
                        Add Funds
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xl font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-liquid w-full pl-9 pr-4"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition text-center ${
                      parsedAmount === amt
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                        : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {/* Payout Summary */}
              {parsedAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="stat-card mb-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">Shares received</span>
                    <span className="text-white font-semibold">
                      {shares.toFixed(2)} {outcome}
                    </span>
                  </div>
                  <div className="border-t border-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">If you win</span>
                    <div className="text-right">
                      <span className={`font-bold ${isYes ? 'text-purple-400' : 'text-gray-300'}`}>
                        ${potentialPayout.toFixed(2)}
                      </span>
                      {profitPercent > 0 && (
                        <span className="text-xs text-green-400 ml-1.5">
                          +{profitPercent.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full touch-target rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  canSubmit
                    ? isYes
                      ? "btn-yes"
                      : "btn-no"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                }`}
              >
                <span>
                  {isRealWallet ? "Bet" : "Place"} ${parsedAmount.toFixed(2) || '0'}{isRealWallet ? " USDT0" : ""} on {outcome}
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Mode indicator */}
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-white/40">
                <Zap className="w-4 h-4 text-purple-400" />
                {isRealWallet ? (
                  <span>Zero gas fees · Real USDT0</span>
                ) : (
                  <span>Demo mode · No real money</span>
                )}
              </div>
            </>
          )}

          {step === "signing" && (
            <div className="py-16 text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/20 flex items-center justify-center"
              >
                <Wallet className="w-8 h-8 text-purple-400" />
              </motion.div>
              <p className="text-white font-semibold text-lg">Confirm in your wallet</p>
              <p className="text-white/50 text-sm mt-2">Sign the transaction to place your bet</p>
            </div>
          )}

          {step === "submitting" && (
            <div className="py-16 text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-purple-500/20 flex items-center justify-center"
              >
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </motion.div>
              <p className="text-white font-semibold text-lg">Placing your bet...</p>
              <p className="text-white/50 text-sm mt-2">This takes about 2 seconds</p>
            </div>
          )}

          {step === "success" && (
            <div className="py-16 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-purple-500/20"
              >
                <Check className="w-10 h-10 text-purple-400" />
              </motion.div>
              <p className="text-white font-bold text-xl mb-2">Bet Placed! 🎉</p>
              <p className="text-white/50">
                {shares.toFixed(2)} {outcome} shares for ${parsedAmount.toFixed(2)}
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-red-500/20 mx-auto mb-6 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-white font-bold text-xl mb-2">Transaction Failed</p>
              <p className="text-white/50 text-sm mb-6">{errorMsg || "Please try again"}</p>
              <button
                onClick={() => setStep("input")}
                className="btn-secondary px-8 py-3"
              >
                Try Again
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
