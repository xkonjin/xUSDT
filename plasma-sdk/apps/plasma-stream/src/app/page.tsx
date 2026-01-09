/**
 * Plasma Stream Dashboard Page
 * 
 * Main dashboard for managing payment streams.
 * Displays user's sending and receiving streams with options to
 * create new streams or withdraw from existing ones.
 * 
 * Features:
 * - Tab-based view for sending vs receiving streams
 * - Real-time balance display
 * - Stream creation link
 * - Withdrawal support for receiving streams
 * 
 * Note: This is running in DEMO MODE - streams are not persisted
 * and no actual funds are transferred on the blockchain.
 */

'use client';

import { useState, useEffect } from 'react';
import { usePlasmaWallet, useUSDT0Balance } from '@plasma-pay/privy-auth';
import { StreamCard } from '@/components/StreamCard';
import { Plus, AlertTriangle, Wallet, LogOut, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import Link from 'next/link';
import type { Stream } from '@plasma-pay/core';

export default function DashboardPage() {
  const { authenticated, ready, wallet, login, logout } = usePlasmaWallet();
  const { formatted, refresh } = useUSDT0Balance();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [tab, setTab] = useState<'sending' | 'receiving'>('sending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet?.address) return;

    async function fetchStreams() {
      setLoading(true);
      try {
        const res = await fetch(`/api/streams?address=${wallet?.address}&role=${tab}`);
        if (res.ok) {
          const data = await res.json();
          setStreams(data.streams || []);
        }
      } catch {
        // Silent fail - empty list will be shown
      } finally {
        setLoading(false);
      }
    }

    fetchStreams();
  }, [wallet?.address, tab]);

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

  // Unauthenticated state - show login prompt
  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl liquid-glass-plasma flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-[rgb(0,212,255)]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">Plasma</span> Stream
          </h1>
          <p className="text-white/50 mb-8 text-lg">
            Stream salary payments in real-time. Pay employees by the second.
          </p>
        </div>
        <button
          onClick={login}
          className="btn-primary flex items-center gap-3"
        >
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header with branding and user info */}
      <header className="liquid-glass rounded-2xl p-4 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          <span className="gradient-text">Plasma</span> Stream
        </h1>
        <div className="flex items-center gap-4">
          <div className="liquid-glass-subtle rounded-xl px-4 py-2 hidden sm:flex items-center gap-2">
            <span className="text-[rgb(0,212,255)] font-semibold">${formatted || '0.00'}</span>
            <span className="text-white/50 text-sm">USDT0</span>
          </div>
          <button 
            onClick={logout} 
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Demo Mode Banner */}
      <div className="mb-6 liquid-glass rounded-2xl p-4 border-amber-500/30 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <span className="font-semibold text-amber-400">Demo Mode</span>
          <p className="text-white/50 text-sm mt-0.5">
            Streams are simulated. No actual funds are transferred or locked. Data resets on server restart.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Tab navigation and create button */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="liquid-glass-subtle rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setTab('sending')}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                tab === 'sending' 
                  ? 'bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)] text-black font-semibold shadow-[0_0_20px_rgba(0,212,255,0.3)]' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Sending
            </button>
            <button
              onClick={() => setTab('receiving')}
              className={`px-4 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                tab === 'receiving' 
                  ? 'bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)] text-black font-semibold shadow-[0_0_20px_rgba(0,212,255,0.3)]' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Receiving
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
              {tab === 'sending' ? (
                <ArrowUpRight className="w-8 h-8 text-white/30" />
              ) : (
                <ArrowDownLeft className="w-8 h-8 text-white/30" />
              )}
            </div>
            <p className="text-white/50 mb-4">
              {tab === 'sending' ? "You haven't created any streams yet" : "No incoming streams"}
            </p>
            {tab === 'sending' && (
              <Link
                href="/create"
                className="text-[rgb(0,212,255)] hover:underline font-medium"
              >
                Create your first stream
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id.toString()}
                stream={stream}
                role={tab}
                onWithdraw={refresh}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
