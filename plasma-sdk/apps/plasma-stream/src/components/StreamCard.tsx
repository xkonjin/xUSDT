'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Clock, User, Download, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Stream } from '@plasma-pay/core';

interface StreamCardProps {
  stream: Stream;
  role: 'sending' | 'receiving';
  walletAddress?: string;
  onWithdraw?: () => void;
}

export function StreamCard({ stream, role, walletAddress, onWithdraw }: StreamCardProps) {
  const [withdrawable, setWithdrawable] = useState(0n);
  const [withdrawing, setWithdrawing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
    if (withdrawable <= 0n || !walletAddress) return;
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
        onWithdraw?.();
      }
    } catch {
      // Silent fail - button re-enables for retry
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
        onWithdraw?.();
      }
    } catch {
      // Silent fail - button re-enables for retry
    } finally {
      setCancelling(false);
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
    <div className="liquid-glass rounded-2xl p-6 transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${stream.active ? 'bg-green-500/20 border border-green-500/30' : 'liquid-glass-subtle'}`}>
            {stream.active ? (
              <Play className="w-4 h-4 text-green-400" />
            ) : (
              <Pause className="w-4 h-4 text-white/40" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">
                {role === 'sending' ? 'To' : 'From'}: {counterparty.slice(0, 6)}...{counterparty.slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-white/40" />
              <span className="text-sm text-white/60">
                {isEnded ? 'Ended' : `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-white">${totalAmount.toFixed(2)}</div>
          <div className="text-sm text-white/40">Total</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[rgb(0,212,255)] to-[rgb(0,180,220)] transition-all duration-1000 shadow-[0_0_10px_rgba(0,212,255,0.5)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm">
          <span className="text-white/50">Withdrawn: ${withdrawnAmount.toFixed(2)}</span>
          <span className="text-[rgb(0,212,255)] font-medium">Available: ${availableAmount.toFixed(2)}</span>
        </div>
      </div>

      {role === 'receiving' && withdrawable > 0n && (
        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          {withdrawing ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
          className="w-full mt-3 px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 flex items-center justify-center gap-2 transition-colors"
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
  );
}
