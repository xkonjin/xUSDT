"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Loader2, AlertCircle, ArrowRight, Info, Gamepad2 } from "lucide-react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { usePredictionStore } from "@/lib/store";
import { usePlaceBet } from "@/hooks/useBets";
import { useDemoStore, formatDemoBalance } from "@/lib/demo-store";
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
  
  // Demo mode
  const { isDemoMode, demoBalance, placeDemoBet } = useDemoStore();

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
    if (isDemoMode) {
      return demoBalance;
    }
    return Number(balance || BigInt(0)) / 10 ** USDT0_DECIMALS;
  }, [balance, isDemoMode, demoBalance]);

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

  // In demo mode, can submit without authentication
  const canSubmit = (isDemoMode || authenticated) && parsedAmount >= 1 && parsedAmount <= balanceNum;

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
      // Demo mode: instant bet placement without wallet
      if (isDemoMode) {
        setStep("submitting");
        
        // Simulate a small delay for UX
        await new Promise((r) => setTimeout(r, 800));
        
        const demoBet = placeDemoBet({
          market,
          outcome: outcome!,
          amount: parsedAmount,
        });
        
        if (!demoBet) {
          throw new Error("Insufficient demo balance");
        }
        
        setStep("success");
        setTimeout(() => {
          handleClose();
        }, 2000);
        return;
      }
      
      // Real mode: sign and submit
      setStep("signing");
      
      await placeBet.mutateAsync({
        marketId: market.id,
        outcome: outcome!,
        amount: amountAtomic,
        minAmountOut,
      });

      setStep("success");
      refreshBalance();
      
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      setStep("error");
      setErrorMsg(error?.message || "Transaction failed");
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
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          onClick={(e) => e.stopPropagation()}
          className="bottom-sheet w-full sm:max-w-md sm:rounded-2xl p-6 safe-area-bottom"
        >
          {/* Drag Handle (mobile) */}
          <div className="flex justify-center mb-5 sm:hidden">
            <div className="w-12 h-1.5 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              {/* Demo Badge */}
              {isDemoMode && (
                <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-lg bg-[rgba(var(--accent-cyan),0.15)] border border-[rgba(var(--accent-cyan),0.3)] w-fit">
                  <Gamepad2 className="w-3.5 h-3.5 text-[rgb(var(--accent-cyan))]" />
                  <span className="text-xs font-semibold text-[rgb(var(--accent-cyan))] uppercase tracking-wide">
                    Demo Bet
                  </span>
                </div>
              )}
              <div className={`${isYes ? 'badge-yes' : 'badge-no'} inline-block mb-3`}>
                {outcome}
              </div>
              <h2 className="text-lg font-semibold text-white leading-snug">
                {market.question}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2.5 hover:bg-white/10 rounded-xl transition -mr-2 -mt-2"
            >
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>

          {/* Content based on step */}
          {step === "input" && (
            <>
              {/* Amount Input */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/60">
                    Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">
                      {isDemoMode ? 'Demo' : ''} Balance: {isDemoMode ? formatDemoBalance(demoBalance) : formatUSDT(balance || BigInt(0))}
                    </span>
                    <button
                      onClick={() => setAmount(balanceNum.toString())}
                      className="text-xs font-semibold text-[rgb(var(--accent-cyan))] hover:underline"
                    >
                      Max
                    </button>
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
                    className="input-liquid w-full pl-9 pr-4 text-2xl font-bold h-14"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmount(amt.toString())}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap flex-shrink-0
                      ${parsedAmount === amt
                        ? "bg-gradient-to-br from-[rgba(var(--accent-cyan),0.3)] to-[rgba(var(--accent-violet),0.3)] text-white border border-[rgba(var(--accent-cyan),0.3)]"
                        : "bg-white/5 text-white/60 border border-transparent hover:bg-white/10 hover:text-white/80"
                      }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {/* Summary Card */}
              <div className="stat-card mb-6 space-y-4">
                {/* Shares */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">You receive</span>
                  <span className="text-white font-semibold">
                    {shares.toFixed(2)} {outcome} shares
                  </span>
                </div>
                
                {/* Price */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Current price</span>
                  <span className="text-white font-medium">{formatPrice(price)}</span>
                </div>
                
                {/* Divider */}
                <div className="border-t border-white/5" />
                
                {/* Potential Outcomes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isYes ? 'bg-[rgb(var(--yes-green))]' : 'bg-[rgb(var(--no-red))]'}`} />
                      <span className="text-sm text-white/50">If {outcome} wins</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${isYes ? 'text-[rgb(var(--yes-green))]' : 'text-[rgb(var(--no-red))]'}`}>
                        ${potentialPayout.toFixed(2)}
                      </span>
                      {profitPercent > 0 && (
                        <span className={`text-xs ml-1.5 ${isYes ? 'text-[rgb(var(--yes-green))]' : 'text-[rgb(var(--no-red))]'}`}>
                          +{profitPercent.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${!isYes ? 'bg-[rgb(var(--yes-green))]' : 'bg-[rgb(var(--no-red))]'}`} />
                      <span className="text-sm text-white/50">If {outcome === "YES" ? "NO" : "YES"} wins</span>
                    </div>
                    <span className="font-bold text-white/40">$0.00</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              {isDemoMode || authenticated ? (
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`w-full touch-target rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                    ${canSubmit
                      ? isYes
                        ? "btn-yes"
                        : "btn-no"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                >
                  <span>{isDemoMode ? 'Place Demo Bet' : 'Place Bet'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={login}
                  className="w-full btn-primary touch-target text-lg font-bold"
                >
                  Connect Wallet to Bet
                </button>
              )}

              {/* Gasless Notice */}
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-white/40">
                {isDemoMode ? (
                  <>
                    <Gamepad2 className="w-4 h-4 text-[rgb(var(--accent-cyan))]" />
                    <span>Demo mode • No real money involved</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-[rgb(var(--accent-cyan))]" />
                    <span>Zero gas fees • Instant execution</span>
                  </>
                )}
              </div>
            </>
          )}

          {step === "signing" && (
            <div className="py-16 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[rgba(var(--accent-cyan),0.2)] to-[rgba(var(--accent-violet),0.2)] flex items-center justify-center"
              >
                <Loader2 className="w-8 h-8 text-[rgb(var(--accent-cyan))]" />
              </motion.div>
              <p className="text-white font-semibold text-lg">Confirm in wallet</p>
              <p className="text-white/50 text-sm mt-2">Sign the transaction to continue</p>
            </div>
          )}

          {step === "submitting" && (
            <div className="py-16 text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[rgba(var(--accent-cyan),0.2)] to-[rgba(var(--accent-violet),0.2)] flex items-center justify-center"
              >
                <Zap className="w-8 h-8 text-[rgb(var(--accent-cyan))]" />
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
                className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center ${
                  isYes 
                    ? 'bg-[rgba(var(--yes-green),0.15)]' 
                    : 'bg-[rgba(var(--no-red),0.15)]'
                }`}
              >
                <Check className={`w-10 h-10 ${isYes ? 'text-[rgb(var(--yes-green))]' : 'text-[rgb(var(--no-red))]'}`} />
              </motion.div>
              <p className="text-white font-bold text-xl mb-2">Bet Placed!</p>
              <p className="text-white/50">
                {shares.toFixed(2)} {outcome} shares for ${parsedAmount.toFixed(2)}
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[rgba(var(--no-red),0.15)] mx-auto mb-6 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-[rgb(var(--no-red))]" />
              </div>
              <p className="text-white font-bold text-xl mb-2">Transaction Failed</p>
              <p className="text-white/50 text-sm mb-6">{errorMsg || "Please try again"}</p>
              <button
                onClick={() => setStep("input")}
                className="btn-secondary px-8"
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
