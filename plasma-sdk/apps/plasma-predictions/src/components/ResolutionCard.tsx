"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, ExternalLink, 
  XCircle, Clock, AlertCircle, PartyPopper
} from "lucide-react";

interface ResolutionCardProps {
  bet: {
    id: string;
    market: string;
    outcome: "YES" | "NO";
    amount: number;
    shares: number;
    resolution: "won" | "lost" | "pending";
    payout?: number;
    resolvedAt?: string;
    txHash?: string;
  };
}

export function ResolutionCard({ bet }: ResolutionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const isWon = bet.resolution === "won";
  const isPending = bet.resolution === "pending";
  const profit = bet.payout ? bet.payout - bet.amount : 0;

  const explorerUrl = bet.txHash
    ? `https://explorer.plasma.to/tx/${bet.txHash}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border ${
        isPending
          ? "bg-yellow-500/5 border-yellow-500/20"
          : isWon
          ? "bg-green-500/5 border-green-500/20"
          : "bg-red-500/5 border-red-500/20"
      }`}
    >
      {/* Status Badge */}
      <div className="flex items-start justify-between mb-3">
        <StatusBadge resolution={bet.resolution} />
        {bet.resolvedAt && (
          <span className="text-xs text-white/40">
            {new Date(bet.resolvedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Market & Outcome */}
      <h4 className="text-white font-medium line-clamp-2 mb-2">{bet.market}</h4>
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
          bet.outcome === "YES" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          {bet.outcome}
        </span>
        <span className="text-sm text-white/40">
          {bet.shares.toFixed(2)} shares
        </span>
      </div>

      {/* Payout Section */}
      {!isPending && (
        <div className={`p-3 rounded-xl ${isWon ? "bg-green-500/10" : "bg-white/5"}`}>
          {isWon ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-xs text-white/40">Payout</p>
                  <p className="text-lg font-bold text-green-400">
                    ${bet.payout?.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40">Profit</p>
                <p className="text-sm font-medium text-green-400">
                  +${profit.toFixed(2)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-xs text-white/40">Amount Lost</p>
                <p className="text-lg font-bold text-red-400">
                  -${bet.amount.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Message */}
      {isPending && (
        <div className="p-3 bg-yellow-500/10 rounded-xl">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
            <p className="text-sm text-yellow-400">
              Awaiting market resolution...
            </p>
          </div>
        </div>
      )}

      {/* Transaction Details */}
      {explorerUrl && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/60 transition"
        >
          <span>View Details</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}

      {showDetails && explorerUrl && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-white/10"
        >
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>View on Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <p className="text-xs text-white/30 font-mono mt-2 truncate">
            TX: {bet.txHash}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatusBadge({ resolution }: { resolution: "won" | "lost" | "pending" }) {
  if (resolution === "pending") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 rounded-lg">
        <Clock className="w-3.5 h-3.5 text-yellow-400" />
        <span className="text-xs font-medium text-yellow-400">Pending</span>
      </div>
    );
  }

  if (resolution === "won") {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-lg">
        <Trophy className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs font-medium text-green-400">Won</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-lg">
      <XCircle className="w-3.5 h-3.5 text-red-400" />
      <span className="text-xs font-medium text-red-400">Lost</span>
    </div>
  );
}

// Notification component for push notifications
export function ResolutionNotification({ 
  market, 
  won, 
  payout 
}: { 
  market: string;
  won: boolean;
  payout: number;
}) {
  return (
    <div className={`p-4 rounded-xl ${won ? "bg-green-500/10" : "bg-red-500/10"}`}>
      <div className="flex items-start gap-3">
        {won ? (
          <PartyPopper className="w-6 h-6 text-green-400" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-400" />
        )}
        <div className="flex-1">
          <p className={`font-medium ${won ? "text-green-400" : "text-red-400"}`}>
            {won ? "Congratulations! You won!" : "Market resolved - Better luck next time"}
          </p>
          <p className="text-sm text-white/60 mt-1 line-clamp-1">{market}</p>
          {won && (
            <p className="text-lg font-bold text-green-400 mt-2">
              +${payout.toFixed(2)} credited to your balance
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
