"use client";

import { useState } from "react";
import { Info, AlertTriangle, TrendingUp, Droplets } from "lucide-react";

interface MarketDepthProps {
  liquidity: number;
  yesPrice: number;
  noPrice: number;
  betAmount: number;
  outcome: "YES" | "NO";
}

export function MarketDepth({ liquidity, yesPrice, noPrice, betAmount, outcome }: MarketDepthProps) {
  const [slippageTolerance, setSlippageTolerance] = useState(1);

  // Calculate price impact based on bet size vs liquidity
  const priceImpact = calculatePriceImpact(betAmount, liquidity);
  const estimatedPrice = outcome === "YES" 
    ? yesPrice * (1 + priceImpact / 100)
    : noPrice * (1 + priceImpact / 100);
  
  const isHighSlippage = priceImpact > slippageTolerance;

  return (
    <div className="space-y-3">
      {/* Slippage Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-white/60">
          <Info className="w-4 h-4" />
          <span>Slippage Tolerance</span>
        </div>
        <div className="flex gap-1">
          {[0.5, 1, 2, 3].map((val) => (
            <button
              key={val}
              onClick={() => setSlippageTolerance(val)}
              className={`px-2 py-1 text-xs rounded-lg transition ${
                slippageTolerance === val
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      {/* Liquidity Display */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-white/60">Pool Liquidity</span>
        </div>
        <span className="text-sm font-medium text-white">
          ${formatLiquidity(liquidity)}
        </span>
      </div>

      {/* Price Impact */}
      {betAmount > 0 && (
        <div className={`p-3 rounded-xl ${isHighSlippage ? "bg-red-500/10" : "bg-white/5"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/60">Price Impact</span>
            </div>
            <span className={`text-sm font-medium ${
              isHighSlippage ? "text-red-400" : priceImpact > 0.5 ? "text-yellow-400" : "text-green-400"
            }`}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Expected Price</span>
            <span className="text-white/80">{(estimatedPrice * 100).toFixed(1)}¢</span>
          </div>

          {isHighSlippage && (
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400/80">
                High slippage! Price impact ({priceImpact.toFixed(1)}%) exceeds your tolerance ({slippageTolerance}%).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Order Book Visualization */}
      <div className="p-3 bg-white/5 rounded-xl">
        <p className="text-xs text-white/40 mb-2">Order Book Depth</p>
        <div className="space-y-1">
          <OrderBookBar side="YES" price={yesPrice} />
          <OrderBookBar side="NO" price={noPrice} />
        </div>
      </div>
    </div>
  );
}

function OrderBookBar({ side, price }: { side: string; price: number }) {
  const width = Math.min(price * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs w-8 ${side === "YES" ? "text-green-400" : "text-red-400"}`}>
        {side}
      </span>
      <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
        <div 
          className={`h-full ${side === "YES" ? "bg-green-500/30" : "bg-red-500/30"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs text-white/60 w-12 text-right">{(price * 100).toFixed(0)}¢</span>
    </div>
  );
}

function calculatePriceImpact(amount: number, liquidity: number): number {
  if (liquidity <= 0) return 0;
  // Simplified constant product formula approximation
  const impact = (amount / liquidity) * 100;
  return Math.min(impact, 50); // Cap at 50%
}

function formatLiquidity(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}
