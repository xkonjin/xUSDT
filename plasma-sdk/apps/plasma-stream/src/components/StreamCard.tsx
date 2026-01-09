'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Stream } from '@plasma-pay/core';

interface StreamCardProps {
  stream: Stream;
  role: 'sending' | 'receiving';
  onWithdraw?: () => void;
}

export function StreamCard({ stream, role, onWithdraw }: StreamCardProps) {
  const [withdrawable, setWithdrawable] = useState(0n);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const start = BigInt(stream.startTime);
    const end = BigInt(stream.endTime);
    const cliff = BigInt(stream.cliffTime);

    if (now < start || now < cliff) {
      setWithdrawable(0n);
      return;
    }

    const elapsed = now > end ? end - start : now - start;
    const duration = end - start;
    const streamed = (stream.depositAmount * elapsed) / duration;
    setWithdrawable(streamed - stream.withdrawnAmount);

    const interval = setInterval(() => {
      const currentNow = BigInt(Math.floor(Date.now() / 1000));
      const currentElapsed = currentNow > end ? end - start : currentNow - start;
      const currentStreamed = (stream.depositAmount * currentElapsed) / duration;
      setWithdrawable(currentStreamed - stream.withdrawnAmount);
    }, 1000);

    return () => clearInterval(interval);
  }, [stream]);

  const handleWithdraw = async () => {
    if (withdrawable <= 0n) return;
    setWithdrawing(true);

    try {
      const res = await fetch('/api/streams/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId: stream.id.toString() }),
      });

      if (res.ok) {
        onWithdraw?.();
      }
    } catch {
      // Silent fail - button re-enables for retry
    } finally {
      setWithdrawing(false);
    }
  };

  const progress = Number(
    (stream.withdrawnAmount * BigInt(100)) / stream.depositAmount
  );

  const totalAmount = Number(stream.depositAmount) / 1e6;
  const withdrawnAmount = Number(stream.withdrawnAmount) / 1e6;
  const availableAmount = Number(withdrawable) / 1e6;
  const endDate = new Date(stream.endTime * 1000);
  const isEnded = Date.now() > stream.endTime * 1000;
  const counterparty = role === 'sending' ? stream.recipient : stream.sender;

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${stream.active ? 'bg-green-900/30' : 'bg-gray-800'}`}>
            {stream.active ? (
              <Play className="w-4 h-4 text-green-400" />
            ) : (
              <Pause className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">
                {role === 'sending' ? 'To' : 'From'}: {counterparty.slice(0, 6)}...{counterparty.slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">
                {isEnded ? 'Ended' : `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-plasma-500 transition-all duration-1000"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500">Withdrawn: ${withdrawnAmount.toFixed(2)}</span>
          <span className="text-plasma-500">Available: ${availableAmount.toFixed(2)}</span>
        </div>
      </div>

      {role === 'receiving' && withdrawable > 0n && (
        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          className="w-full bg-plasma-500 hover:bg-plasma-600 disabled:bg-gray-700 text-black font-semibold py-3 rounded-xl transition-colors"
        >
          {withdrawing ? 'Withdrawing...' : `Withdraw $${availableAmount.toFixed(2)}`}
        </button>
      )}
    </div>
  );
}
