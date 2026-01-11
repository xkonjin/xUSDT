'use client';

/**
 * Balance Dashboard Page
 * 
 * Full view of user's balance summary across all bills.
 */

import { usePlasmaWallet } from '@plasma-pay/privy-auth';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { BalanceDashboard } from '@/components/BalanceDashboard';

export default function BalancesPage() {
  const { authenticated, ready, wallet, login } = usePlasmaWallet();

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[rgb(0,212,255)] animate-spin" />
          <span className="text-white/50">Loading...</span>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
        <p className="text-white/50">Please log in to view your balances</p>
        <button onClick={login} className="btn-primary">
          Login
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.08)_0%,transparent_70%)] blur-3xl" />
      </div>

      <header className="flex items-center gap-4 mb-8 relative z-10">
        <Link
          href="/"
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white/60" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Balances
          </h1>
          <p className="text-white/40 text-sm">
            Track what you owe and are owed
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto relative z-10">
        {wallet?.address && (
          <BalanceDashboard address={wallet.address} />
        )}
      </div>
    </main>
  );
}
