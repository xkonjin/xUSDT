'use client';

import { useState } from 'react';
import { usePlasmaWallet, useGaslessTransfer } from '@plasma-pay/privy-auth';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseUnits } from 'viem';

export default function CreateStreamPage() {
  const router = useRouter();
  const { wallet, authenticated } = usePlasmaWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30');
  const [cliffDays, setCliffDays] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !recipient || !amount) return;

    setLoading(true);
    setError(null);

    try {
      const amountInUnits = parseUnits(amount, 6).toString();
      const durationSeconds = parseInt(duration) * 24 * 60 * 60;
      const cliffSeconds = parseInt(cliffDays) * 24 * 60 * 60;

      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: wallet.address,
          recipient,
          depositAmount: amountInUnits,
          duration: durationSeconds,
          cliffDuration: cliffSeconds,
          cancelable: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create stream');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">Please connect your wallet first.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-8">Create Stream</h1>

        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Total Amount (USDT0)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Duration (days)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-plasma-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">Cliff (days)</label>
              <input
                type="number"
                value={cliffDays}
                onChange={(e) => setCliffDays(e.target.value)}
                min="0"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-plasma-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4">
            <h3 className="text-sm font-medium mb-3">Stream Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span>${amount || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span>{duration} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rate</span>
                <span>
                  ${amount ? (parseFloat(amount) / parseInt(duration)).toFixed(2) : '0.00'}/day
                </span>
              </div>
              {parseInt(cliffDays) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliff Period</span>
                  <span>{cliffDays} days</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !recipient || !amount}
            className="w-full bg-plasma-500 hover:bg-plasma-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-xl transition-colors"
          >
            {loading ? 'Creating...' : 'Create Stream'}
          </button>
        </form>
      </div>
    </main>
  );
}
