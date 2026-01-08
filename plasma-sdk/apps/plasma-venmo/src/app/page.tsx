'use client';

import { usePlasmaWallet, useUSDT0Balance } from '@plasma-pay/privy-auth';
import { SendMoneyForm } from '@/components/SendMoneyForm';
import { TransactionHistory } from '@/components/TransactionHistory';
import { formatUnits } from 'viem';

export default function HomePage() {
  const { user, authenticated, ready, wallet, login, logout } = usePlasmaWallet();
  const { balance, formatted, refresh } = useUSDT0Balance();

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
            <span className="text-plasma-500">Plasma</span> Venmo
          </h1>
          <p className="text-gray-400 mb-8">Send money to anyone via email or phone. Zero gas fees.</p>
        </div>
        
        <button
          onClick={login}
          className="bg-plasma-500 hover:bg-plasma-600 text-black font-semibold px-8 py-4 rounded-xl transition-colors"
        >
          Get Started
        </button>
        
        <div className="text-gray-500 text-sm mt-8">
          Powered by Plasma Chain - Gasless USDT0 transfers
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">
          <span className="text-plasma-500">Plasma</span> Venmo
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm hidden sm:block">
            {wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}
          </span>
          <button
            onClick={logout}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-gray-900 rounded-2xl p-6">
          <div className="text-gray-400 text-sm mb-1">Your Balance</div>
          <div className="text-4xl font-bold">
            ${formatted || '0.00'}
            <span className="text-gray-500 text-lg ml-2">USDT0</span>
          </div>
          <button
            onClick={refresh}
            className="text-plasma-500 text-sm mt-2 hover:underline"
          >
            Refresh
          </button>
        </div>

        <SendMoneyForm wallet={wallet} onSuccess={refresh} />
        
        <TransactionHistory address={wallet?.address} />
      </div>
    </main>
  );
}
