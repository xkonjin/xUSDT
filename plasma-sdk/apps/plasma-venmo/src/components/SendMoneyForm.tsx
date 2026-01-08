'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import type { PlasmaEmbeddedWallet } from '@plasma-pay/privy-auth';
import { sendMoney } from '@/lib/send';

interface SendMoneyFormProps {
  wallet: PlasmaEmbeddedWallet | null;
  onSuccess?: () => void;
}

export function SendMoneyForm({ wallet, onSuccess }: SendMoneyFormProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !recipient || !amount) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await sendMoney(wallet, {
        recipientIdentifier: recipient,
        amount,
      });

      if (result.success) {
        setSuccess(`Sent $${amount} successfully!`);
        setRecipient('');
        setAmount('');
        onSuccess?.();
      } else {
        setError(result.error || 'Transaction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const isValidRecipient = recipient.includes('@') || /^\+?\d{10,}$/.test(recipient);
  const isValidAmount = parseFloat(amount) > 0;
  const canSubmit = wallet && isValidRecipient && isValidAmount && !loading;

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Send Money</h2>
      
      <div>
        <label className="block text-gray-400 text-sm mb-2">
          To (email or phone)
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="friend@email.com or +1234567890"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-500 transition-colors"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-gray-400 text-sm mb-2">
          Amount (USDT0)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-plasma-500 transition-colors"
            disabled={loading}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-700 text-green-400 rounded-xl px-4 py-3 text-sm">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-plasma-500 hover:bg-plasma-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send {amount ? `$${amount}` : 'Money'}
          </>
        )}
      </button>

      <p className="text-gray-500 text-xs text-center">
        Zero gas fees on Plasma Chain
      </p>
    </form>
  );
}
