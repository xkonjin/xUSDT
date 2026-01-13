"use client";

import Image from "next/image";
import { ExternalLink, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PolymarketComparisonProps {
  plasmaYesPrice: number;
  plasmaNoPrice: number;
  polymarketYesPrice: number;
  polymarketNoPrice: number;
  polymarketUrl?: string;
  lastSynced?: Date;
}

export function PolymarketComparison({
  plasmaYesPrice,
  plasmaNoPrice,
  polymarketYesPrice,
  polymarketNoPrice,
  polymarketUrl,
  lastSynced,
}: PolymarketComparisonProps) {
  const yesDiff = (plasmaYesPrice - polymarketYesPrice) * 100;
  const noDiff = (plasmaNoPrice - polymarketNoPrice) * 100;
  
  const hasArbitrage = Math.abs(yesDiff) > 1 || Math.abs(noDiff) > 1;
  const timeSinceSync = lastSynced 
    ? Math.floor((Date.now() - lastSynced.getTime()) / 1000)
    : null;

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Image 
            src="https://polymarket.com/favicon.ico" 
            alt="Polymarket" 
            width={16}
            height={16}
            className="w-4 h-4"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            unoptimized
          />
          <span className="text-sm font-medium text-white">Polymarket Comparison</span>
        </div>
        {polymarketUrl && (
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Price Comparison */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <PriceCompareCell
          label="YES"
          plasmaPrice={plasmaYesPrice}
          polyPrice={polymarketYesPrice}
          diff={yesDiff}
          color="green"
        />
        <PriceCompareCell
          label="NO"
          plasmaPrice={plasmaNoPrice}
          polyPrice={polymarketNoPrice}
          diff={noDiff}
          color="red"
        />
      </div>

      {/* Arbitrage Alert */}
      {hasArbitrage && (
        <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400">
              Arbitrage opportunity: {Math.abs(yesDiff).toFixed(1)}¢ difference detected
            </span>
          </div>
        </div>
      )}

      {/* Sync Status */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>
            {timeSinceSync !== null 
              ? `Synced ${timeSinceSync < 60 ? `${timeSinceSync}s` : `${Math.floor(timeSinceSync / 60)}m`} ago`
              : "Prices sync every 30s"
            }
          </span>
        </div>
      </div>
    </div>
  );
}

function PriceCompareCell({
  label,
  plasmaPrice,
  polyPrice,
  diff,
  color,
}: {
  label: string;
  plasmaPrice: number;
  polyPrice: number;
  diff: number;
  color: "green" | "red";
}) {
  const DiffIcon = diff > 0.5 ? TrendingUp : diff < -0.5 ? TrendingDown : Minus;
  const diffColor = Math.abs(diff) > 1 
    ? "text-yellow-400" 
    : diff > 0 ? "text-green-400/60" : diff < 0 ? "text-red-400/60" : "text-white/40";

  return (
    <div className="p-2 bg-white/5 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${color === "green" ? "text-green-400" : "text-red-400"}`}>
          {label}
        </span>
        <div className={`flex items-center gap-0.5 ${diffColor}`}>
          <DiffIcon className="w-3 h-3" />
          <span className="text-xs">{diff > 0 ? "+" : ""}{diff.toFixed(1)}¢</span>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-white">{(plasmaPrice * 100).toFixed(0)}¢</span>
        <span className="text-xs text-white/40">vs {(polyPrice * 100).toFixed(0)}¢</span>
      </div>
    </div>
  );
}
