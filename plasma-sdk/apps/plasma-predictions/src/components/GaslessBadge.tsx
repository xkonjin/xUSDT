"use client";

import { Sparkles, Zap, ExternalLink } from "lucide-react";
import { plasmaMainnet } from "@plasma-pay/core";

interface GaslessBadgeProps {
  txHash?: string;
  className?: string;
  variant?: "inline" | "card";
}

export function GaslessBadge({ txHash, className = "", variant = "inline" }: GaslessBadgeProps) {
  const explorerUrl = txHash 
    ? `${plasmaMainnet.blockExplorers?.default?.url || "https://explorer.plasma.to"}/tx/${txHash}`
    : null;

  if (variant === "card") {
    return (
      <div className={`p-3 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/20 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-cyan-500/20 rounded-lg">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Gasless Transaction</p>
            <p className="text-xs text-white/40">Sponsored by Plasma Network</p>
          </div>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-white/10 rounded-lg transition"
            >
              <ExternalLink className="w-4 h-4 text-white/40" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg border border-cyan-500/30 ${className}`}>
      <Sparkles className="w-3 h-3 text-cyan-400" />
      <span className="text-xs font-medium text-cyan-400">Gasless</span>
    </div>
  );
}

export function SponsoredByPlasma() {
  return (
    <div className="flex items-center gap-2 text-xs text-white/40">
      <Zap className="w-3 h-3 text-cyan-400" />
      <span>Sponsored by</span>
      <a 
        href="https://plasma.to" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 transition"
      >
        Plasma
      </a>
    </div>
  );
}
