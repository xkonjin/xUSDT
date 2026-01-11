"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePlasmaWallet, useUSDT0Balance, useFundWallet } from "@plasma-pay/privy-auth";
import {
  Wallet,
  LogOut,
  ChevronDown,
  Plus,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { formatUSDT, formatAddress } from "@/lib/constants";

export function Header() {
  const { authenticated, login, logout, wallet, ready } = usePlasmaWallet();
  const address = wallet?.address;
  const { balance, loading: isLoading } = useUSDT0Balance();
  const { fundWallet } = useFundWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 liquid-glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <span className="font-bold text-lg text-white hidden sm:block">
            Plasma <span className="text-gradient-purple">Predictions</span>
          </span>
        </Link>

        {/* Nav Links - Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/predictions"
            className="text-white/70 hover:text-white transition text-sm font-medium"
          >
            Markets
          </Link>
          <Link
            href="/my-bets"
            className="text-white/70 hover:text-white transition text-sm font-medium"
          >
            My Bets
          </Link>
          <Link
            href="/leaderboard"
            className="text-white/70 hover:text-white transition text-sm font-medium"
          >
            Leaderboard
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {!ready ? (
            <div className="w-24 h-10 bg-white/10 rounded-xl animate-pulse" />
          ) : authenticated ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition"
              >
                <Wallet className="w-4 h-4 text-prediction-primary" />
                <span className="text-sm font-medium text-white">
                  {isLoading ? "..." : formatUSDT(balance || BigInt(0))}
                </span>
                <span className="text-white/40 text-sm hidden sm:block">
                  {formatAddress(address || "")}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-white/40 transition-transform ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-64 liquid-glass-elevated rounded-xl overflow-hidden"
                  >
                    {/* Balance */}
                    <div className="p-4 border-b border-white/10">
                      <p className="text-white/40 text-xs mb-1">USDT0 Balance</p>
                      <p className="text-2xl font-bold text-white">
                        {formatUSDT(balance || BigInt(0))}
                      </p>
                    </div>

                    {/* Address */}
                    <div className="p-3 border-b border-white/10">
                      <button
                        onClick={handleCopy}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/5 transition"
                      >
                        <span className="text-white/70 text-sm font-mono">
                          {formatAddress(address || "")}
                        </span>
                        {copied ? (
                          <Check className="w-4 h-4 text-yes" />
                        ) : (
                          <Copy className="w-4 h-4 text-white/40" />
                        )}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          fundWallet();
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition"
                      >
                        <Plus className="w-4 h-4 text-yes" />
                        <span className="text-white text-sm">Deposit USDT0</span>
                      </button>
                      <a
                        href={`https://explorer.plasma.to/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition"
                      >
                        <ExternalLink className="w-4 h-4 text-white/60" />
                        <span className="text-white text-sm">View on Explorer</span>
                      </a>
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition"
                      >
                        <LogOut className="w-4 h-4 text-no" />
                        <span className="text-white text-sm">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button onClick={login} className="btn-primary text-sm px-4 py-2">
              Get Started
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
