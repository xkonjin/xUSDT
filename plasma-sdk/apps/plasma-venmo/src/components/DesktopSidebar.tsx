"use client";

import { motion } from "framer-motion";
import {
  Home,
  Send,
  Clock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  DollarSign,
  HandCoins,
  LogOut,
} from "lucide-react";
import type { NavTab } from "./BottomNav";

interface DesktopSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSend: () => void;
  onRequest: () => void;
  onAddFunds: () => void;
  balance?: string;
  balanceLoading?: boolean;
  balanceVisible?: boolean;
  onToggleBalance?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  userEmail?: string;
  walletAddress?: string;
  onLogout?: () => void;
}

const navigationItems: {
  id: NavTab;
  label: string;
  icon: typeof Home;
  shortcut?: string;
}[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "send", label: "Send", icon: Send, shortcut: "⌘S" },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "profile", label: "Profile", icon: User },
];

export function DesktopSidebar({
  activeTab,
  onTabChange,
  onSend,
  onRequest,
  onAddFunds,
  balance,
  balanceLoading,
  balanceVisible = true,
  onToggleBalance,
  onRefresh,
  isRefreshing,
  userEmail,
  walletAddress,
  onLogout,
}: DesktopSidebarProps) {
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <aside className="hidden lg:flex flex-col w-[280px] min-h-dvh sticky top-0 bg-[rgb(var(--bg-primary))] border-r border-white/[0.06]">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-plenmo-500 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-xl text-white">
                Plenmo
              </span>
              <div className="w-2 h-2 rounded-full bg-plenmo-500" />
            </div>
            <span className="text-xs text-white/40">Plasma Payments</span>
          </div>
        </div>
      </div>

      {/* Balance Section */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/50">Balance</span>
          <div className="flex items-center gap-1">
            {onToggleBalance && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onToggleBalance}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white/70 transition-colors"
                aria-label={balanceVisible ? "Hide balance" : "Show balance"}
              >
                {balanceVisible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </motion.button>
            )}
            {onRefresh && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white/70 transition-colors disabled:opacity-50"
                aria-label="Refresh balance"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </motion.button>
            )}
          </div>
        </div>
        <div className="font-heading font-bold text-2xl text-white tabular-nums">
          {balanceLoading ? (
            <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
          ) : balanceVisible ? (
            `$${balance || "0.00"}`
          ) : (
            "••••••"
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map(({ id, label, icon: Icon, shortcut }) => {
          const isActive = activeTab === id;

          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center justify-between rounded-xl p-3 min-h-[44px] transition-colors ${
                isActive
                  ? "bg-plenmo-500/10 text-plenmo-500"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </div>
              {shortcut && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/30 font-mono">
                  {shortcut}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div className="p-4 space-y-2 border-t border-white/[0.06]">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSend}
          className="w-full flex items-center justify-between bg-plenmo-500 text-white rounded-xl p-3 min-h-[44px] hover:bg-plenmo-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5" />
            <span className="font-medium">Send Money</span>
          </div>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/30 font-mono">
            ⌘S
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onRequest}
          className="w-full flex items-center justify-between bg-white/5 text-white rounded-xl p-3 min-h-[44px] hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <HandCoins className="w-5 h-5" />
            <span className="font-medium">Request Money</span>
          </div>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/30 font-mono">
            ⌘R
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAddFunds}
          className="w-full flex items-center justify-between bg-white/5 text-white rounded-xl p-3 min-h-[44px] hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">Add Funds</span>
          </div>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/30 font-mono">
            ⌘F
          </span>
        </motion.button>
      </div>

      {/* User Section */}
      {(userEmail || walletAddress) && (
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          <div className="space-y-1">
            {userEmail && (
              <div className="text-sm text-white/70 truncate">{userEmail}</div>
            )}
            {walletAddress && (
              <div className="text-xs text-white/40 font-mono">
                {truncateAddress(walletAddress)}
              </div>
            )}
          </div>

          {onLogout && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onLogout}
              className="w-full flex items-center gap-3 text-red-400/80 hover:text-red-400 hover:bg-red-400/5 rounded-xl p-3 min-h-[44px] transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </motion.button>
          )}
        </div>
      )}
    </aside>
  );
}
