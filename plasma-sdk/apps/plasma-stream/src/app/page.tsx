/**
 * StreamPay Dashboard
 * 
 * Main dashboard displaying payment streams with Liquid Glass design.
 * Features: Balance header, stream cards with progress rings, empty states.
 */

"use client";

import { useState, useEffect } from "react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { StreamProgressRing } from "@/components/ProgressRing";
import {
  Plus,
  Wallet,
  LogOut,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Clock,
  User,
  Play,
  Pause,
  Download,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface StreamData {
  id: string;
  sender: string;
  recipient: string;
  depositAmount: string;
  withdrawnAmount: string;
  startTime: number;
  endTime: number;
  cliffTime: number;
  cliffAmount: string;
  ratePerSecond: string;
  cancelable: boolean;
  active: boolean;
}

export default function DashboardPage() {
  const { authenticated, ready, wallet, login, logout } = usePlasmaWallet();
  const { formatted, refresh: refreshBalance } = useUSDT0Balance();
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [tab, setTab] = useState<"sending" | "receiving">("sending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStreams = async () => {
    if (!wallet?.address) return;

    try {
      const res = await fetch(
        `/api/streams?address=${wallet.address}&role=${tab}`
      );
      if (res.ok) {
        const data = await res.json();
        setStreams(data.streams || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!wallet?.address) return;
    setLoading(true);
    fetchStreams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address, tab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStreams();
    refreshBalance();
  };

  // Loading state while Privy initializes
  if (!ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span className="text-white/50 font-body">Loading...</span>
        </div>
      </main>
    );
  }

  // Unauthenticated state - Welcome screen
  if (!authenticated) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-6 relative overflow-hidden">
        {/* Demo Mode Badge */}
        <div className="demo-badge">Demo Mode</div>

        {/* Background gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-30%] left-[20%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.12)_0%,transparent_70%)] blur-3xl" />
          <div className="absolute bottom-[-20%] right-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.08)_0%,transparent_70%)] blur-3xl" />
        </div>

        <div className="text-center max-w-md relative z-10">
          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl glass-card flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-12 h-12 text-brand-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-heading font-bold mb-4">
            <span className="gradient-text">Stream</span>
            <span className="text-white">Pay</span>
          </h1>
          <p className="text-white/60 font-body text-lg leading-relaxed mb-10 text-balance">
            Real-time salary streaming. Pay your team by the second with zero gas fees.
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="glass-card-subtle p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-brand-500/20 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-brand-400" />
              </div>
              <p className="text-white/70 text-sm font-medium">Real-time</p>
            </div>
            <div className="glass-card-subtle p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white/70 text-sm font-medium">Zero Fees</p>
            </div>
            <div className="glass-card-subtle p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-white/70 text-sm font-medium">Secure</p>
            </div>
          </div>
        </div>

        <button 
          onClick={login} 
          className="glass-button px-8 py-4 text-lg relative z-10 touch-target"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 md:p-6 relative pb-24">
      {/* Demo Mode Badge */}
      <div className="demo-badge">Demo Mode</div>

      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.06)_0%,transparent_70%)] blur-3xl" />
      </div>

      {/* Glass Header with Balance */}
      <header className="glass-card p-4 md:p-6 mb-6 relative z-10 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-brand-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-heading font-bold">
                <span className="gradient-text">Stream</span>
                <span className="text-white">Pay</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Balance Display */}
            <div className="glass-card-subtle rounded-xl px-4 py-2.5 hidden sm:flex items-center gap-2">
              <span className="text-brand-400 font-heading font-bold text-lg">
                ${formatted || "0.00"}
              </span>
              <span className="text-white/40 text-sm font-body">USDT0</span>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 touch-target"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all touch-target"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Balance */}
        <div className="sm:hidden mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">Balance</span>
            <span className="text-brand-400 font-heading font-bold text-xl">
              ${formatted || "0.00"} <span className="text-white/40 text-sm font-body font-normal">USDT0</span>
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="glass-card-subtle rounded-xl p-1.5 flex gap-1">
            <button
              onClick={() => setTab("sending")}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 font-body touch-target ${
                tab === "sending"
                  ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white font-semibold shadow-glow-orange"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Sending
              {tab === "sending" && streams.length > 0 && (
                <span className="ml-1 text-xs bg-black/20 px-2 py-0.5 rounded-full">
                  {streams.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("receiving")}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 font-body touch-target ${
                tab === "receiving"
                  ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white font-semibold shadow-glow-orange"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Receiving
              {tab === "receiving" && streams.length > 0 && (
                <span className="ml-1 text-xs bg-black/20 px-2 py-0.5 rounded-full">
                  {streams.length}
                </span>
              )}
            </button>
          </div>

          <Link
            href="/create"
            className="glass-button px-5 py-3 touch-target"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Stream</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>

        {/* Stream List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 glass-card-subtle rounded-glass animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : streams.length === 0 ? (
          /* Empty State */
          <div 
            className="glass-card p-10 md:p-14 text-center animate-scale-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl glass-card-subtle flex items-center justify-center">
              {tab === "sending" ? (
                <ArrowUpRight className="w-10 h-10 text-white/30" />
              ) : (
                <ArrowDownLeft className="w-10 h-10 text-white/30" />
              )}
            </div>
            <h2 className="text-xl font-heading font-semibold text-white mb-2">
              {tab === "sending"
                ? "No outgoing streams"
                : "No incoming streams"}
            </h2>
            <p className="text-white/50 font-body mb-8 max-w-sm mx-auto">
              {tab === "sending"
                ? "Create your first payment stream to start paying someone in real-time"
                : "Streams you receive from others will appear here"}
            </p>
            {tab === "sending" && (
              <Link
                href="/create"
                className="glass-button inline-flex"
              >
                <Plus className="w-4 h-4" />
                Create your first stream
              </Link>
            )}
          </div>
        ) : (
          /* Stream Cards */
          <div className="space-y-4">
            {streams.map((stream, index) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                role={tab}
                walletAddress={wallet?.address}
                onAction={handleRefresh}
                delay={index * 0.05}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/* ----------------------------------------
   StreamCard Component (inline for simplicity)
   ---------------------------------------- */
interface StreamCardProps {
  stream: StreamData;
  role: 'sending' | 'receiving';
  walletAddress?: string;
  onAction?: () => void;
  delay?: number;
}

function StreamCard({ stream, role, walletAddress, onAction, delay = 0 }: StreamCardProps) {
  const [withdrawable, setWithdrawable] = useState(0);
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Calculate progress and withdrawable amount
  useEffect(() => {
    const updateWithdrawable = () => {
      const now = Math.floor(Date.now() / 1000);
      const start = stream.startTime;
      const end = stream.endTime;
      const cliff = stream.cliffTime;
      const depositAmount = parseFloat(stream.depositAmount);
      const withdrawnAmount = parseFloat(stream.withdrawnAmount);

      if (now < start || now < cliff) {
        setWithdrawable(0);
        return;
      }

      const elapsed = Math.min(now, end) - start;
      const duration = end - start || 1;
      const streamed = (depositAmount * elapsed) / duration;
      setWithdrawable(Math.max(0, streamed - withdrawnAmount));
    };

    updateWithdrawable();
    const interval = setInterval(updateWithdrawable, 1000);
    return () => clearInterval(interval);
  }, [stream]);

  const handleWithdraw = async () => {
    if (withdrawable <= 0 || !walletAddress) return;
    setWithdrawing(true);

    try {
      const res = await fetch('/api/streams/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          streamId: stream.id.toString(),
          recipientAddress: walletAddress,
        }),
      });

      if (res.ok) {
        onAction?.();
      }
    } catch {
      // Silent fail
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCancel = async () => {
    if (!walletAddress || !stream.cancelable || !stream.active) return;
    setCancelling(true);

    try {
      const res = await fetch('/api/streams/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          streamId: stream.id.toString(),
          senderAddress: walletAddress,
        }),
      });

      if (res.ok) {
        onAction?.();
      }
    } catch {
      // Silent fail
    } finally {
      setCancelling(false);
    }
  };

  const depositAmount = parseFloat(stream.depositAmount) / 1e6;
  const withdrawnAmount = parseFloat(stream.withdrawnAmount) / 1e6;
  const progress = depositAmount > 0 ? (withdrawnAmount / depositAmount) * 100 : 0;
  const availableAmount = withdrawable / 1e6;
  const streamedAmount = (parseFloat(stream.depositAmount) / 1e6) * (progress / 100);
  const endDate = new Date(stream.endTime * 1000);
  const isEnded = Date.now() > stream.endTime * 1000;
  const counterparty = role === 'sending' ? stream.recipient : stream.sender;
  const initials = counterparty.slice(2, 4).toUpperCase();

  return (
    <div 
      className="glass-card p-5 md:p-6 animate-slide-up hover:shadow-glass-hover transition-all duration-300"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-4">
        {/* Progress Ring */}
        <StreamProgressRing
          progress={progress}
          size={80}
          strokeWidth={6}
          streamedAmount={streamedAmount.toFixed(2)}
          className="flex-shrink-0 hidden sm:flex"
        />

        {/* Stream Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            {/* Recipient/Sender Info */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar - visible on mobile where ring is hidden */}
              <div className="sm:hidden w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0">
                <span className="font-heading font-bold text-white text-sm">{initials}</span>
              </div>
              
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`p-1.5 rounded-lg ${stream.active ? 'bg-green-500/20' : 'bg-white/10'}`}>
                    {stream.active ? (
                      <Play className="w-3 h-3 text-green-400" />
                    ) : (
                      <Pause className="w-3 h-3 text-white/40" />
                    )}
                  </span>
                  <span className="text-sm text-white/60 font-body">
                    {role === 'sending' ? 'To' : 'From'}
                  </span>
                </div>
                <p className="font-heading font-semibold text-white truncate">
                  {counterparty.slice(0, 6)}...{counterparty.slice(-4)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-xs text-white/50 font-body">
                    {isEnded ? 'Ended' : `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
              <p className="font-heading font-bold text-2xl text-white">
                ${depositAmount.toFixed(2)}
              </p>
              <p className="text-xs text-white/50 font-body">Total</p>
            </div>
          </div>

          {/* Progress Bar (mobile) */}
          <div className="sm:hidden mb-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-1000 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs font-body">
              <span className="text-white/50">Withdrawn: ${withdrawnAmount.toFixed(2)}</span>
              <span className="text-brand-400 font-medium">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Desktop progress stats */}
          <div className="hidden sm:flex items-center justify-between text-sm font-body mb-4">
            <span className="text-white/50">
              Withdrawn: <span className="text-white/70">${withdrawnAmount.toFixed(2)}</span>
            </span>
            <span className="text-brand-400 font-medium">
              Available: ${availableAmount.toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          {role === 'receiving' && withdrawable > 0 && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="w-full glass-button py-3 touch-target"
            >
              {withdrawing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Withdrawing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Withdraw ${availableAmount.toFixed(2)}
                </>
              )}
            </button>
          )}

          {role === 'sending' && stream.cancelable && stream.active && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full mt-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center gap-2 transition-all font-body font-medium touch-target"
            >
              {cancelling ? (
                <>
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Cancel Stream
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
