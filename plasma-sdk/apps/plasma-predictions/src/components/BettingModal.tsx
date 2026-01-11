"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Loader2, AlertCircle } from "lucide-react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { usePredictionStore } from "@/lib/store";
import { usePlaceBet } from "@/hooks/useBets";
import {
  formatUSDT,
  formatPrice,
  parseUSDT,
  QUICK_AMOUNTS,
  USDT0_DECIMALS,
} from "@/lib/constants";

export function BettingModal() {
  const { bettingModal, closeBettingModal, slippage } = usePredictionStore();
  const { isOpen, market, outcome } = bettingModal;
  const { authenticated, login, wallet } = usePlasmaWallet();
  const { balance, refresh: refreshBalance } = useUSDT0Balance();
  const placeBet = usePlaceBet();

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "signing" | "submitting" | "success" | "error">("input");
  const [errorMsg, setErrorMsg] = useState("");

  const parsedAmount = useMemo(() => {
    const val = parseFloat(amount);
    return isNaN(val) ? 0 : val;
  }, [amount]);

  const amountAtomic = useMemo(() => {
    return parseUSDT(parsedAmount);
  }, [parsedAmount]);

  const balanceNum = useMemo(() => {
    return Number(balance || BigInt(0)) / 10 ** USDT0_DECIMALS;
  }, [balance]);

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

  const canSubmit = authenticated && parsedAmount >= 1 && parsedAmount <= balanceNum;

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
      setStep("signing");
      
      await placeBet.mutateAsync({
        marketId: market.id,
        outcome: outcome!,
        amount: amountAtomic,
        minAmountOut,
      });

      setStep("success");
      refreshBalance();
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: unknown) {
      setStep("error");
      const message = error instanceof Error ? error.message : "Transaction failed";
      setErrorMsg(message);
    }
  };

  if (!isOpen || !market || !outcome) return null;

  const price = outcome === "YES" ? market.yesPrice : market.noPrice;
  const isYes = outcome === "YES";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bottom-sheet w-full sm:max-w-md sm:rounded-2xl p-6 safe-area-bottom"
        >
          {/* Drag Handle (mobile) */}
          <div className="flex justify-center mb-4 sm:hidden">
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className={`badge-${isYes ? "yes" : "no"} inline-block mb-2`}>
                {outcome}
              </div>
              <h2 className="text-lg font-semibold text-white">
                {market.question}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Content based on step */}
          {step === "input" && (
            <>
              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm text-white/60 mb-2">
                  Bet Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-lg">
                    $
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-glass w-full pl-8 pr-4 text-xl font-semibold"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-white/40">
                    Balance: {formatUSDT(balance || BigInt(0))}
                  </span>
                  <button
                    onClick={() => setAmount(balanceNum.toString())}
                    className="text-prediction-primary hover:underline"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
                      ${parsedAmount === amt
                        ? "bg-prediction-primary text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="stat-card mb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">You receive</span>
                  <span className="text-white font-medium">
                    {shares.toFixed(2)} {outcome} shares
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Current price</span>
                  <span className="text-white">{formatPrice(price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Slippage tolerance</span>
                  <span className="text-white">{slippage}%</span>
                </div>
                <div className="border-t border-white/10 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">If {outcome} wins</span>
                    <span className={`font-semibold ${isYes ? "text-yes" : "text-no"}`}>
                      {formatUSDT(potentialPayout)} (+{profitPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-white/60">If {outcome === "YES" ? "NO" : "YES"} wins</span>
                    <span className="text-no font-semibold">$0.00 (-100%)</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              {authenticated ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`w-full touch-target rounded-xl font-semibold text-white flex items-center justify-center gap-2
                    ${canSubmit
                      ? isYes
                        ? "btn-yes"
                        : "btn-no"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                >
                  <Zap className="w-5 h-5" />
                  Place Bet - {formatUSDT(amountAtomic)}
                </button>
              ) : (
                <button
                  onClick={login}
                  className="w-full btn-primary touch-target"
                >
                  Connect to Bet
                </button>
              )}

              {/* Gasless Badge */}
              <p className="text-center text-sm text-white/40 mt-3 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4 text-prediction-primary" />
                Zero gas • Instant execution
              </p>
            </>
          )}

          {step === "signing" && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-prediction-primary animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Sign in your wallet...</p>
              <p className="text-white/60 text-sm mt-1">Confirm the transaction</p>
            </div>
          )}

          {step === "submitting" && (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 text-prediction-primary animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Placing bet...</p>
              <p className="text-white/60 text-sm mt-1">This will take a few seconds</p>
            </div>
          )}

          {step === "success" && (
            <div className="py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center
                  ${isYes ? "bg-yes/20" : "bg-no/20"}`}
              >
                <Check className={`w-8 h-8 ${isYes ? "text-yes" : "text-no"}`} />
              </motion.div>
              <p className="text-white font-medium text-lg">Bet Placed!</p>
              <p className="text-white/60 text-sm mt-1">
                {shares.toFixed(2)} {outcome} shares for {formatUSDT(amountAtomic)}
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-no/20 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-no" />
              </div>
              <p className="text-white font-medium text-lg">Transaction Failed</p>
              <p className="text-white/60 text-sm mt-1">{errorMsg || "Please try again"}</p>
              <button
                onClick={() => setStep("input")}
                className="btn-secondary mt-4"
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
