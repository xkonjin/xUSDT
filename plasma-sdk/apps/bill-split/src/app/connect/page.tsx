"use client";

/**
 * Telegram Wallet Connection Page
 * 
 * This page is opened as a Telegram Mini App when users tap
 * "Connect Wallet" in the Splitzy bot.
 * 
 * Flow:
 * 1. User taps connect button in Telegram
 * 2. Mini App opens with their Telegram user ID in URL
 * 3. User connects wallet via Privy
 * 4. We save the Telegram ID -> Wallet mapping
 * 5. Close Mini App and notify bot
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import {
  Loader2,
  CheckCircle,
  Wallet,
  AlertCircle,
  ArrowRight,
} from "lucide-react";


type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      close: () => void;
    };
  };
};

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const telegramUserId = searchParams.get("tgUserId");
  const telegramUsername = searchParams.get("tgUsername");

  // Wallet state
  const { authenticated, ready, wallet, login, logout } = usePlasmaWallet();

  // Page state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save when wallet is connected
  useEffect(() => {
    async function saveMapping() {
      if (!authenticated || !wallet?.address || !telegramUserId || saving || saved) {
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/telegram/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramUserId,
            telegramUsername,
            walletAddress: wallet.address,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save wallet connection");
        }

        setSaved(true);

        // Try to close the Mini App after a delay
        // This uses Telegram's WebApp API if available
        setTimeout(() => {
          if (typeof window !== "undefined") {
            const telegramWindow = window as TelegramWindow;
            telegramWindow.Telegram?.WebApp?.close();
          }
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect");
      } finally {
        setSaving(false);
      }
    }

    saveMapping();
  }, [authenticated, wallet?.address, telegramUserId, telegramUsername, saving, saved]);

  // Loading state
  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin" />
      </main>
    );
  }

  // No Telegram user ID
  if (!telegramUserId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Open from Telegram</h1>
          <p className="text-white/50">
            This page should be opened from the Splitzy bot in Telegram.
          </p>
        </div>
      </main>
    );
  }

  // Success state
  if (saved) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Wallet Connected!</h1>
          <p className="text-white/50 mb-4">
            Your Plasma wallet is now linked to your Telegram account.
          </p>
          <p className="text-white/70 font-mono text-sm mb-6">
            {wallet?.address?.slice(0, 10)}...{wallet?.address?.slice(-8)}
          </p>
          <p className="text-white/30 text-sm">
            You can close this window and return to the bot.
          </p>
        </div>
      </main>
    );
  }

  // Connected but saving
  if (authenticated && saving) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin mx-auto mb-4" />
          <p className="text-white/50">Saving wallet connection...</p>
        </div>
      </main>
    );
  }

  // Main connection UI
  return (
    <main className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-md mx-auto pt-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-5xl mb-6">🔗</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Connect Your Wallet
          </h1>
          <p className="text-white/50">
            Link your Plasma wallet to receive bill split payments instantly.
          </p>
        </div>

        {/* Connection Card */}
        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
          {authenticated ? (
            // Already connected - show address
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgb(0,212,255)]/20 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-[rgb(0,212,255)]" />
              </div>
              <p className="text-white font-medium mb-2">Wallet Connected</p>
              <p className="text-white/50 font-mono text-sm mb-4">
                {wallet?.address?.slice(0, 10)}...{wallet?.address?.slice(-8)}
              </p>
              
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => logout()}
                  className="flex-1 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => setSaved(false)} // Retry save
                  className="flex-1 p-3 rounded-xl bg-[rgb(0,212,255)] hover:bg-[rgb(0,180,220)] text-black font-medium text-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            // Not connected - show connect button
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/50 mb-6">
                Connect your wallet to get started
              </p>
              <button
                onClick={login}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-[rgb(0,212,255)] to-purple-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[rgb(0,212,255)]/20 transition-all"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 space-y-4">
          <div className="flex items-start gap-3 text-white/40 text-sm">
            <span className="text-lg">💰</span>
            <p>Receive payments from any chain, automatically converted to USDT0</p>
          </div>
          <div className="flex items-start gap-3 text-white/40 text-sm">
            <span className="text-lg">⚡</span>
            <p>Zero gas fees on Plasma Chain</p>
          </div>
          <div className="flex items-start gap-3 text-white/40 text-sm">
            <span className="text-lg">🔒</span>
            <p>Your keys, your crypto - we never have access to your funds</p>
          </div>
        </div>
      </div>

      {/* Gradient background effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[30%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.1)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-20%] right-[20%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)] blur-3xl" />
      </div>
    </main>
  );
}

