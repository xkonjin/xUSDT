"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Clock, ArrowDownLeft, Loader2 } from "lucide-react";
import {
  initTelegramWebApp,
  hapticFeedback,
  showBackButton,
  hideBackButton,
} from "@/lib/telegram";
import Link from "next/link";

interface Stream {
  id: string;
  sender: string;
  depositAmount: string;
  withdrawnAmount: string;
  startTime: number;
  endTime: number;
  active: boolean;
}

export default function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  useEffect(() => {
    initTelegramWebApp();
    showBackButton(() => {
      window.location.href = "/";
    });

    // Load demo streams
    setStreams([
      {
        id: "1",
        sender: "0x1234...5678",
        depositAmount: "1000000000", // 1000 USDT0
        withdrawnAmount: "250000000", // 250 withdrawn
        startTime: Math.floor(Date.now() / 1000) - 86400 * 7, // 7 days ago
        endTime: Math.floor(Date.now() / 1000) + 86400 * 23, // 23 days left
        active: true,
      },
    ]);
    setLoading(false);

    return () => {
      hideBackButton();
    };
  }, []);

  const calculateWithdrawable = (stream: Stream) => {
    const now = Math.floor(Date.now() / 1000);
    const duration = stream.endTime - stream.startTime;
    if (duration <= 0) return 0;
    const elapsed = Math.max(0, Math.min(now - stream.startTime, duration));
    const vested = (BigInt(stream.depositAmount) * BigInt(elapsed)) / BigInt(duration);
    const withdrawable = vested - BigInt(stream.withdrawnAmount);
    return Math.max(0, Number(withdrawable)) / 1_000_000;
  };

  const calculateProgress = (stream: Stream) => {
    const now = Math.floor(Date.now() / 1000);
    const duration = stream.endTime - stream.startTime;
    if (duration <= 0) return 0;
    const elapsed = Math.max(0, Math.min(now - stream.startTime, duration));
    return Math.min(100, Math.max(0, (elapsed / duration) * 100));
  };

  const handleWithdraw = async (streamId: string) => {
    setWithdrawing(streamId);
    hapticFeedback("medium");

    // Simulate withdrawal
    await new Promise((resolve) => setTimeout(resolve, 1500));

    hapticFeedback("success");
    setWithdrawing(null);

    // Update stream
    setStreams((prev) =>
      prev.map((s) =>
        s.id === streamId
          ? {
              ...s,
              withdrawnAmount: (
                BigInt(s.depositAmount) *
                BigInt(Math.floor((Date.now() / 1000 - s.startTime) / (s.endTime - s.startTime) * 1000000)) /
                BigInt(1000000)
              ).toString(),
            }
          : s
      )
    );
  };

  return (
    <div className="min-h-screen p-4 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          onClick={() => hapticFeedback("light")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">Payment Streams</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[rgb(0,212,255)] animate-spin" />
        </div>
      ) : streams.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Clock className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/40">No active streams</p>
          <p className="text-white/20 text-sm mt-1">
            Streams you receive will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {streams.map((stream) => {
            const withdrawable = calculateWithdrawable(stream);
            const progress = calculateProgress(stream);
            const total = Number(stream.depositAmount) / 1_000_000;

            return (
              <div key={stream.id} className="glass rounded-2xl p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <ArrowDownLeft className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">From {stream.sender}</p>
                      <p className="text-white/40 text-sm">Salary Stream</p>
                    </div>
                  </div>
                  {stream.active && (
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                      Active
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/50">Progress</span>
                    <span className="text-white">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[rgb(0,212,255)] to-green-400 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-white/40 text-xs mb-1">Total</p>
                    <p className="text-white font-semibold">${total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-1">Withdrawable</p>
                    <p className="text-green-400 font-semibold">
                      ${withdrawable.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Withdraw button */}
                {withdrawable > 0 && (
                  <button
                    onClick={() => handleWithdraw(stream.id)}
                    disabled={withdrawing === stream.id}
                    className="w-full py-3 rounded-xl bg-green-500/20 text-green-400 font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {withdrawing === stream.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Withdrawing...
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="w-4 h-4" />
                        Withdraw ${withdrawable.toFixed(2)}
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
