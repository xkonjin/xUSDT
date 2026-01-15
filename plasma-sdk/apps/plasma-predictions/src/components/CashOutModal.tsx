"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, TrendingUp, TrendingDown, AlertCircle, Check } from "lucide-react";
import { useDemoStore } from "@/lib/demo-store";
import { formatUSDT } from "@/lib/constants";
import { toast } from "sonner";

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: {
    id: string;
    marketId: string;
    market: string;
    outcome: "YES" | "NO";
    amount: number;
    shares: number;
    entryPrice: number;
    currentPrice: number;
  } | null;
}

export function CashOutModal({ isOpen, onClose, bet }: CashOutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isDemoMode, cashOutDemoBet, demoBalance } = useDemoStore();

  if (!bet) return null;

  const currentValue = bet.shares * bet.currentPrice;
  const pnl = currentValue - bet.amount;
  const pnlPercent = (pnl / bet.amount) * 100;
  const isProfit = pnl >= 0;

  const handleCashOut = async () => {
    setIsProcessing(true);
    
    try {
      if (isDemoMode) {
        const success = cashOutDemoBet(bet.id, bet.currentPrice);
        if (success) {
          toast.success("Position closed!", {
            description: `You received $${currentValue.toFixed(2)} (${isProfit ? "+" : ""}${pnlPercent.toFixed(1)}%)`,
          });
          onClose();
        } else {
          toast.error("Failed to close position");
        }
      } else {
        // Real cash out - would call API
        await new Promise(r => setTimeout(r, 2000));
        toast.success("Position closed!");
        onClose();
      }
    } catch (error) {
      toast.error("Failed to cash out");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50"
          >
            <div className="liquid-metal-elevated rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Cash Out Position</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Market Info */}
                <div className="p-4 bg-white/5 rounded-xl">
                  <p className="text-sm text-white/60 mb-1">Position</p>
                  <p className="text-white font-medium line-clamp-2">{bet.market}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      bet.outcome === "YES" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {bet.outcome}
                    </span>
                    <span className="text-white/40 text-sm">
                      {bet.shares.toFixed(2)} shares @ {(bet.entryPrice * 100).toFixed(0)}¢
                    </span>
                  </div>
                </div>

                {/* Value Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-1">Cost Basis</p>
                    <p className="text-lg font-bold text-white">${bet.amount.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-1">Current Value</p>
                    <p className="text-lg font-bold text-white">${currentValue.toFixed(2)}</p>
                  </div>
                </div>

                {/* P&L */}
                <div className={`p-4 rounded-xl ${isProfit ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isProfit ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                      <span className="text-white/60">Profit/Loss</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}>
                        {isProfit ? "+" : ""}{pnlPercent.toFixed(1)}%
                      </p>
                      <p className={`text-sm ${isProfit ? "text-green-400/70" : "text-red-400/70"}`}>
                        {isProfit ? "+" : ""}${pnl.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-400/80">
                    Cashing out will close your position at the current market price. This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={handleCashOut}
                  disabled={isProcessing}
                  className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                    isProfit
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  } disabled:opacity-50`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5" />
                      Cash Out for ${currentValue.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
