/**
 * Plasma Stream Dashboard Page
 *
 * Main dashboard for managing payment streams.
 * Displays user's sending and receiving streams.
 */

"use client";

import { useState, useEffect } from "react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { StreamCard } from "@/components/StreamCard";
import {
  Plus,
  Wallet,
  LogOut,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

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
  }, [wallet?.address, tab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStreams();
    refreshBalance();
  };

  // Loading state while Privy initializes
  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[rgb(0,212,255)] border-t-transparent animate-spin" />
          <span className="text-white/50">Loading...</span>
        </div>
      </main>
    );
  }

  // Unauthenticated state
  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[30%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.15)_0%,transparent_70%)] blur-3xl" />
          <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] blur-3xl" />
        </div>

        <div className="text-center max-w-md relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[rgb(0,212,255)]/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-10 h-10 text-[rgb(0,212,255)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">Plasma</span>{" "}
            <span className="text-white">Stream</span>
          </h1>
          <p className="text-white/50 mb-8 text-lg leading-relaxed">
            Stream salary payments in real-time. Pay employees by the second
            with zero gas fees.
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-white/5 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-[rgb(0,212,255)]" />
              </div>
              <p className="text-white/40 text-xs">Real-time</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-white/5 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white/40 text-xs">Zero Fees</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-white/5 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-white/40 text-xs">Secure</p>
            </div>
          </div>
        </div>

        <button onClick={login} className="btn-primary flex items-center gap-3 relative z-10">
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      </main>
    );
  }

  // Count streams for tabs
  const sendingCount = tab === "sending" ? streams.length : 0;
  const receivingCount = tab === "receiving" ? streams.length : 0;

  return (
    <main className="min-h-screen p-4 md:p-8 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.08)_0%,transparent_70%)] blur-3xl" />
      </div>

      {/* Header */}
      <header className="liquid-glass rounded-2xl p-4 mb-6 flex items-center justify-between relative z-10">
        <h1 className="text-2xl font-bold">
          <span className="gradient-text">Plasma</span>{" "}
          <span className="text-white">Stream</span>
        </h1>
        <div className="flex items-center gap-4">
          <div className="liquid-glass-subtle rounded-xl px-4 py-2 hidden sm:flex items-center gap-2">
            <span className="text-[rgb(0,212,255)] font-semibold">
              ${formatted || "0.00"}
            </span>
            <span className="text-white/50 text-sm">USDT0</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Tab navigation and create button */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="liquid-glass-subtle rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setTab("sending")}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                tab === "sending"
                  ? "bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)] text-black font-semibold shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Sending
              {tab === "sending" && streams.length > 0 && (
                <span className="ml-1 text-xs bg-black/20 px-1.5 py-0.5 rounded">
                  {streams.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("receiving")}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                tab === "receiving"
                  ? "bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)] text-black font-semibold shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Receiving
              {tab === "receiving" && streams.length > 0 && (
                <span className="ml-1 text-xs bg-black/20 px-1.5 py-0.5 rounded">
                  {streams.length}
                </span>
              )}
            </button>
          </div>

          <Link
            href="/create"
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Stream</span>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 liquid-glass-subtle rounded-2xl animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl liquid-glass-subtle flex items-center justify-center">
              {tab === "sending" ? (
                <ArrowUpRight className="w-8 h-8 text-white/30" />
              ) : (
                <ArrowDownLeft className="w-8 h-8 text-white/30" />
              )}
            </div>
            <p className="text-white/50 text-lg mb-2">
              {tab === "sending"
                ? "No outgoing streams"
                : "No incoming streams"}
            </p>
            <p className="text-white/30 text-sm mb-6">
              {tab === "sending"
                ? "Create a stream to start paying someone over time"
                : "Streams you receive will appear here"}
            </p>
            {tab === "sending" && (
              <Link
                href="/create"
                className="text-[rgb(0,212,255)] hover:underline font-medium"
              >
                Create your first stream →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream as any}
                role={tab}
                walletAddress={wallet?.address}
                onWithdraw={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
