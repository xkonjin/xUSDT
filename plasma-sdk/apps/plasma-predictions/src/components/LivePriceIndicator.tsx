"use client";

import { motion } from "framer-motion";
import type { ConnectionStatus, PriceChange } from "@/lib/price-updater";

interface LivePriceIndicatorProps {
  isLive: boolean;
  className?: string;
}

/**
 * Indicator showing when real-time price data is being received
 */
export function LivePriceIndicator({ isLive, className = "" }: LivePriceIndicatorProps) {
  if (!isLive) return null;

  return (
    <motion.div
      data-testid="live-indicator"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`inline-flex items-center gap-1 animate-pulse ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--yes-green))]" />
      <span className="text-[10px] font-medium text-[rgb(var(--yes-green))] uppercase tracking-wide">
        Live
      </span>
    </motion.div>
  );
}

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig: Record<ConnectionStatus, { label: string; color: string; dotClass: string }> = {
  connected: {
    label: "Live",
    color: "bg-green-500",
    dotClass: "bg-green-400 animate-pulse",
  },
  connecting: {
    label: "Connecting...",
    color: "bg-yellow-500",
    dotClass: "bg-yellow-400 animate-bounce",
  },
  error: {
    label: "Reconnecting...",
    color: "bg-red-500",
    dotClass: "bg-red-400 animate-pulse",
  },
  disconnected: {
    label: "Offline",
    color: "bg-gray-500",
    dotClass: "bg-gray-400",
  },
};

/**
 * Badge showing the connection status for real-time updates
 */
export function ConnectionStatusBadge({ status, className = "" }: ConnectionStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div
      data-testid="connection-badge"
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white ${config.color} ${className}`}
    >
      <span
        data-testid="status-dot"
        className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`}
      />
      <span>{config.label}</span>
    </div>
  );
}

interface PriceChangeAnimationProps {
  priceChange: PriceChange;
  children: React.ReactNode;
  animationKey?: string | number;
  className?: string;
}

/**
 * Wrapper component that flashes green/red when price changes
 */
export function PriceChangeAnimation({
  priceChange,
  children,
  animationKey,
  className = "",
}: PriceChangeAnimationProps) {
  const animationClass =
    priceChange === "up"
      ? "price-up"
      : priceChange === "down"
      ? "price-down"
      : "";

  return (
    <motion.div
      key={animationKey}
      data-testid="price-animation"
      className={`${animationClass} ${className}`}
      initial={priceChange !== "none" ? { opacity: 0.7 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * CSS styles to add to globals.css for price animations
 * 
 * .price-up {
 *   animation: flash-green 0.5s ease-out;
 * }
 * 
 * .price-down {
 *   animation: flash-red 0.5s ease-out;
 * }
 * 
 * @keyframes flash-green {
 *   0% { background-color: rgba(var(--yes-green), 0.3); }
 *   100% { background-color: transparent; }
 * }
 * 
 * @keyframes flash-red {
 *   0% { background-color: rgba(var(--no-red), 0.3); }
 *   100% { background-color: transparent; }
 * }
 */
