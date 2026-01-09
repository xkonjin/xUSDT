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
import { Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Stream } from '@plasma-pay/core';

export default function DashboardPage() {
  const { user, authenticated, ready, wallet, login, logout } = usePlasmaWallet();
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
      <main className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse text-[rgb(0,212,255)]">Loading...</div>
      </main>
    );
  }

  // Unauthenticated state - show login prompt
  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-black">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-[rgb(0,212,255)]">Plasma</span> Stream
          </h1>
          <p className="text-gray-400 mb-8">
            Stream salary payments in real-time. Pay employees by the second.
          </p>
        </div>
        <button
          onClick={login}
          className="bg-[rgb(0,212,255)] hover:bg-[rgb(0,190,230)] text-black font-semibold px-8 py-4 rounded-xl transition-colors"
        >
          Connect Wallet
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header with branding and user info */}
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          <span className="text-[rgb(0,212,255)]">Plasma</span> Stream
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm hidden sm:block">
            ${formatted || '0.00'} USDT0
          </span>
          <button onClick={logout} className="text-gray-400 hover:text-white text-sm">
            Logout
          </button>
        </div>
      </header>

      {/* Demo Mode Banner */}
      <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <div className="text-sm">
          <span className="font-medium text-amber-400">Demo Mode:</span>
          <span className="text-amber-300/80 ml-1">
            Streams are simulated. No actual funds are transferred or locked. Data resets on server restart.
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Tab navigation and create button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('sending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tab === 'sending' 
                  ? 'bg-[rgb(0,212,255)] text-black font-medium' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Sending
            </button>
            <button
              onClick={() => setTab('receiving')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tab === 'receiving' 
                  ? 'bg-[rgb(0,212,255)] text-black font-medium' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Receiving
            </button>
          </div>
          
          <Link
            href="/create"
            className="flex items-center gap-2 bg-[rgb(0,212,255)] hover:bg-[rgb(0,190,230)] text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Stream
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-12 text-center">
            <p className="text-gray-500 mb-4">
              {tab === 'sending' ? "You haven't created any streams yet" : "No incoming streams"}
            </p>
            {tab === 'sending' && (
              <Link
                href="/create"
                className="text-[rgb(0,212,255)] hover:underline"
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
