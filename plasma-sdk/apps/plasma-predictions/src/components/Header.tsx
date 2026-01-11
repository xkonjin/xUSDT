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
  Sparkles,
  Gamepad2,
  RotateCcw,
} from "lucide-react";
import { formatUSDT, formatAddress } from "@/lib/constants";
import { useDemoStore, formatDemoBalance } from "@/lib/demo-store";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      {/* Animated Logo Mark */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[rgb(var(--accent-cyan))] to-[rgb(var(--accent-violet))] opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
        
        {/* Main logo container */}
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[rgba(var(--accent-cyan),0.2)] to-[rgba(var(--accent-violet),0.2)] border border-white/20 flex items-center justify-center overflow-hidden">
          {/* Chrome reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-60" />
          
          {/* P Letter */}
          <span className="relative text-xl font-black text-gradient">P</span>
        </div>
      </div>
      
      {/* Wordmark */}
      <div className="hidden sm:flex flex-col">
        <span className="text-lg font-bold text-white leading-none tracking-tight">
          Plasma
        </span>
        <span className="text-xs font-semibold text-gradient leading-none tracking-widest uppercase">
          Predictions
        </span>
      </div>
    </Link>
  );
}

export function Header() {
  const { authenticated, login, logout, wallet, ready } = usePlasmaWallet();
  const address = wallet?.address;
  const { balance, loading: isLoading } = useUSDT0Balance();
  const { fundWallet } = useFundWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { 
    isDemoMode, 
    demoBalance, 
    enableDemoMode, 
    disableDemoMode, 
    resetDemoAccount,
    getDemoStats,
    getActiveDemoBets,
  } = useDemoStore();
  
  const demoStats = getDemoStats();
  const activeDemoBets = getActiveDemoBets();

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 liquid-metal border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />

        {/* Nav Links - Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/predictions" className="btn-ghost text-sm">
            Markets
          </Link>
          <Link href="/my-bets" className="btn-ghost text-sm">
            My Bets
          </Link>
          <Link href="/leaderboard" className="btn-ghost text-sm">
            Leaderboard
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {/* Demo Mode Button */}
          {isDemoMode && (
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(var(--accent-cyan),0.1)] hover:bg-[rgba(var(--accent-cyan),0.15)] border border-[rgba(var(--accent-cyan),0.3)] transition-all"
              >
                <Gamepad2 className="w-4 h-4 text-[rgb(var(--accent-cyan))]" />
                <span className="text-sm font-semibold text-[rgb(var(--accent-cyan))]">
                  Demo: {formatDemoBalance(demoBalance)}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[rgb(var(--accent-cyan))] transition-transform ${
                    demoMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {demoMenuOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setDemoMenuOpen(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-72 liquid-metal-elevated rounded-2xl overflow-hidden z-50"
                    >
                      {/* Demo Balance Section */}
                      <div className="p-5 border-b border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                            Demo Balance
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[rgba(var(--accent-cyan),0.15)] text-[rgb(var(--accent-cyan))] text-xs font-semibold">
                            PAPER
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                          {formatDemoBalance(demoBalance)}
                        </p>
                        <p className="text-xs text-white/40 mt-1">Virtual USDT for practice</p>
                      </div>

                      {/* Demo Stats */}
                      <div className="px-5 py-3 border-b border-white/5 grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-white/40">Active Bets</span>
                          <p className="text-lg font-semibold text-white">{activeDemoBets.length}</p>
                        </div>
                        <div>
                          <span className="text-xs text-white/40">Total P&L</span>
                          <p className={`text-lg font-semibold ${demoStats.totalProfit >= 0 ? 'text-[rgb(var(--yes-green))]' : 'text-[rgb(var(--no-red))]'}`}>
                            {demoStats.totalProfit >= 0 ? '+' : ''}{formatDemoBalance(demoStats.totalProfit)}
                          </p>
                        </div>
                      </div>

                      {/* Demo Actions */}
                      <div className="p-2">
                        <button
                          onClick={() => {
                            resetDemoAccount();
                            setDemoMenuOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-white/5 transition group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[rgba(var(--accent-cyan),0.15)] flex items-center justify-center">
                            <RotateCcw className="w-4 h-4 text-[rgb(var(--accent-cyan))]" />
                          </div>
                          <div className="text-left">
                            <span className="text-white text-sm font-medium block">Reset Balance</span>
                            <span className="text-white/40 text-xs">Back to $10,000</span>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => {
                            disableDemoMode();
                            setDemoMenuOpen(false);
                          }}
                          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-white/5 transition group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[rgba(var(--no-red),0.15)] flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-[rgb(var(--no-red))]" />
                          </div>
                          <div className="text-left">
                            <span className="text-white text-sm font-medium block">Exit Demo</span>
                            <span className="text-white/40 text-xs">Switch to real trading</span>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
          
          {/* Real Wallet Section - Only show when NOT in demo mode */}
          {!isDemoMode && (
            <>
              {!ready ? (
                <div className="w-32 h-10 rounded-xl bg-white/5 animate-pulse" />
              ) : authenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[rgb(var(--accent-cyan))] to-[rgb(var(--accent-violet))] flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">$</span>
                      </div>
                      <span className="text-sm font-semibold text-white">
                        {isLoading ? "..." : formatUSDT(balance || BigInt(0))}
                      </span>
                    </div>
                    
                    <span className="text-white/40 text-sm font-mono hidden sm:block">
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
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpen(false)}
                        />
                        
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-72 liquid-metal-elevated rounded-2xl overflow-hidden z-50"
                        >
                          <div className="p-5 border-b border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                                Balance
                              </span>
                              <span className="badge-live">Live</span>
                            </div>
                            <p className="text-3xl font-bold text-white">
                              {formatUSDT(balance || BigInt(0))}
                            </p>
                            <p className="text-xs text-white/40 mt-1">USDT0 on Plasma</p>
                          </div>

                          <div className="p-3 border-b border-white/5">
                            <button
                              onClick={handleCopy}
                              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-white/5 transition group"
                            >
                              <span className="text-white/60 text-sm font-mono group-hover:text-white/80 transition">
                                {formatAddress(address || "", 8)}
                              </span>
                              {copied ? (
                                <Check className="w-4 h-4 text-[rgb(var(--yes-green))]" />
                              ) : (
                                <Copy className="w-4 h-4 text-white/30 group-hover:text-white/60 transition" />
                              )}
                            </button>
                          </div>

                          <div className="p-2">
                            <button
                              onClick={() => {
                                fundWallet();
                                setMenuOpen(false);
                              }}
                              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-white/5 transition group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[rgba(var(--yes-green),0.15)] flex items-center justify-center">
                                <Plus className="w-4 h-4 text-[rgb(var(--yes-green))]" />
                              </div>
                              <div className="text-left">
                                <span className="text-white text-sm font-medium block">Deposit</span>
                                <span className="text-white/40 text-xs">Add USDT0 to wallet</span>
                              </div>
                            </button>
                            
                            <a
                              href={`https://explorer.plasma.to/address/${address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-white/5 transition group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <ExternalLink className="w-4 h-4 text-white/60" />
                              </div>
                              <div className="text-left">
                                <span className="text-white text-sm font-medium block">Explorer</span>
                                <span className="text-white/40 text-xs">View on Plasma</span>
                              </div>
                            </a>
                            
                            <button
                              onClick={() => {
                                logout();
                                setMenuOpen(false);
                              }}
                              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-white/5 transition group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[rgba(var(--no-red),0.15)] flex items-center justify-center">
                                <LogOut className="w-4 h-4 text-[rgb(var(--no-red))]" />
                              </div>
                              <div className="text-left">
                                <span className="text-white text-sm font-medium block">Sign Out</span>
                                <span className="text-white/40 text-xs">Disconnect wallet</span>
                              </div>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={enableDemoMode} 
                    className="btn-secondary text-sm px-4 py-2.5 flex items-center gap-2"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Try Demo</span>
                  </button>
                  <button 
                    onClick={login} 
                    className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Get Started</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
