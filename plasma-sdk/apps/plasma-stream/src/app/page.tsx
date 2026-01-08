'use client';

import { useState, useEffect } from 'react';
import { usePlasmaWallet, useUSDT0Balance } from '@plasma-pay/privy-auth';
import { StreamCard } from '@/components/StreamCard';
import { Plus } from 'lucide-react';
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
      } catch (e) {
        console.error('Failed to fetch streams', e);
      } finally {
        setLoading(false);
      }
    }

    fetchStreams();
  }, [wallet?.address, tab]);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-plasma-500">Loading...</div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-plasma-500">Plasma</span> Stream
          </h1>
          <p className="text-gray-400 mb-8">
            Stream salary payments in real-time. Pay employees by the second.
          </p>
        </div>
        <button
          onClick={login}
          className="bg-plasma-500 hover:bg-plasma-600 text-black font-semibold px-8 py-4 rounded-xl transition-colors"
        >
          Connect Wallet
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          <span className="text-plasma-500">Plasma</span> Stream
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

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('sending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tab === 'sending' ? 'bg-plasma-500 text-black' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Sending
            </button>
            <button
              onClick={() => setTab('receiving')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                tab === 'receiving' ? 'bg-plasma-500 text-black' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Receiving
            </button>
          </div>
          
          <Link
            href="/create"
            className="flex items-center gap-2 bg-plasma-500 hover:bg-plasma-600 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
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
                className="text-plasma-500 hover:underline"
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
