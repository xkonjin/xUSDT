"use client";

import { useState } from "react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { SendMoneyForm } from "@/components/SendMoneyForm";
import { RequestMoneyForm } from "@/components/RequestMoneyForm";
import { PaymentRequests } from "@/components/PaymentRequests";
import { TransactionHistory } from "@/components/TransactionHistory";
import { PaymentLinks } from "@/components/PaymentLinks";
import { FundWalletButton } from "@/components/FundWallet";
import { WalletManagerButton } from "@/components/WalletManager";
import { QRCodeButton } from "@/components/QRCode";
import { UserProfileButton } from "@/components/UserProfile";
import { Send, HandCoins, Sparkles } from "lucide-react";
import { LiveCounter, LiveActivityFeed } from "@/components/LiveActivityFeed";
import { SocialFeed } from "@/components/SocialFeed";

export default function HomePage() {
  const { user, authenticated, ready, wallet, login, logout } =
    usePlasmaWallet();
  const { balance, formatted, refresh } = useUSDT0Balance();
  const [activeTab, setActiveTab] = useState<"send" | "request">("send");
  
  // Get user email from Privy user object
  const userEmail = user?.email?.address;

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[rgb(0,212,255)] border-t-transparent animate-spin" />
          <span className="text-white/50">Loading...</span>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[30%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.15)_0%,transparent_70%)] blur-3xl" />
          <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.1)_0%,transparent_70%)] blur-3xl" />
        </div>

        <div className="text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gradient-text">Plasma</span>{" "}
            <span className="text-white">Pay</span>
          </h1>
          <p className="text-white/60 text-xl max-w-md mx-auto leading-relaxed mb-2">
            Pay anyone instantly. Zero fees.
          </p>
          <p className="text-white/40 text-base max-w-sm mx-auto">
            No crypto jargon. Just simple payments.
          </p>
        </div>

        {/* Trust signals */}
        <div className="flex items-center gap-6 text-white/50 text-sm relative z-10">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Bank-grade security</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[rgb(0,212,255)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Instant transfers</span>
          </div>
        </div>

        <button onClick={login} className="btn-primary relative z-10 animate-pulse-glow text-lg px-8 py-4">
          Get Started Free
        </button>

        <p className="text-white/30 text-sm relative z-10">
          No signup fees. No hidden charges. Ever.
        </p>

        {/* Live counter */}
        <div className="relative z-10 mt-8 clay-card p-6">
          <LiveCounter />
        </div>

        {/* Live activity feed preview */}
        <div className="relative z-10 mt-6 w-full max-w-md">
          <LiveActivityFeed maxItems={3} />
        </div>

        <div className="text-white/40 text-sm mt-8 relative z-10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Powered by Plasma Chain
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.08)_0%,transparent_70%)] blur-3xl" />
      </div>

      <header className="flex items-center justify-between mb-8 relative z-10">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">Plasma</span>{" "}
          <span className="text-white">Venmo</span>
        </h1>
        <div className="flex items-center gap-2">
          <QRCodeButton walletAddress={wallet?.address} username={userEmail} />
          <WalletManagerButton />
          <UserProfileButton user={user} walletAddress={wallet?.address} onLogout={logout} />
        </div>
      </header>

      <div className="max-w-lg mx-auto space-y-6 relative z-10">
        <div className="liquid-glass-elevated rounded-3xl p-8">
          <div className="flex items-start justify-between mb-2">
            <div className="text-white/50 text-sm">Your Balance</div>
            <FundWalletButton walletAddress={wallet?.address} />
          </div>
          <div className="text-5xl font-bold tracking-tight">
            <span className="gradient-text">${formatted || "0.00"}</span>
            <span className="text-white/30 text-xl ml-3 font-medium">
              USDT0
            </span>
          </div>
          <button
            onClick={refresh}
            className="text-[rgb(0,212,255)] text-sm mt-4 hover:underline transition-all duration-200 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Pending payment requests (if any) */}
        <PaymentRequests wallet={wallet} userEmail={userEmail} onRefresh={refresh} />

        {/* Tab switcher for Send/Request */}
        <div className="flex rounded-2xl p-1 liquid-glass-subtle">
          <button
            onClick={() => setActiveTab("send")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 ${
              activeTab === "send"
                ? "bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)]"
                : "text-white/50 hover:text-white"
            }`}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={() => setActiveTab("request")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200 ${
              activeTab === "request"
                ? "bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)]"
                : "text-white/50 hover:text-white"
            }`}
          >
            <HandCoins className="w-4 h-4" />
            Request
          </button>
        </div>

        {/* Active form */}
        {activeTab === "send" ? (
          <SendMoneyForm 
            wallet={wallet} 
            balance={formatted || undefined} 
            onSuccess={refresh} 
          />
        ) : (
          <RequestMoneyForm walletAddress={wallet?.address} userEmail={userEmail} onSuccess={refresh} />
        )}

        <PaymentLinks address={wallet?.address} onRefresh={refresh} />

        <TransactionHistory address={wallet?.address} />

        {/* Social Feed */}
        <SocialFeed address={wallet?.address} className="mt-6" />
      </div>
    </main>
  );
}
