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
import { Send, HandCoins, RefreshCw, Shield, Zap } from "lucide-react";
import { SocialFeed } from "@/components/SocialFeed";

export default function HomePage() {
  const { user, authenticated, ready, wallet, login, logout } = usePlasmaWallet();
  const { balance, formatted, refresh } = useUSDT0Balance();
  const [activeTab, setActiveTab] = useState<"send" | "request">("send");
  
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
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gradient-text">Plenmo</span>
          </h1>
          <p className="text-white/60 text-xl max-w-md mx-auto leading-relaxed mb-2">
            Pay anyone instantly. Zero fees.
          </p>
          <p className="text-white/40 text-base max-w-sm mx-auto">
            No crypto jargon. Just simple payments.
          </p>
        </div>

        <div className="flex items-center gap-6 text-white/50 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Bank-grade security</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[rgb(0,212,255)]" />
            <span>Instant transfers</span>
          </div>
        </div>

        <button onClick={login} className="btn-primary text-lg px-8 py-4 animate-pulse-glow">
          Get Started Free
        </button>

        <p className="text-white/30 text-sm">
          No signup fees. No hidden charges. Ever.
        </p>

        <div className="text-white/40 text-sm mt-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Powered by Plasma Chain
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">Plenmo</span>
        </h1>
        <div className="flex items-center gap-2">
          <QRCodeButton walletAddress={wallet?.address} username={userEmail} />
          <WalletManagerButton />
          <UserProfileButton user={user} walletAddress={wallet?.address} onLogout={logout} />
        </div>
      </header>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Balance Card */}
        <div className="clay-card p-6 md:p-8">
          <div className="flex items-start justify-between mb-2">
            <div className="text-white/50 text-sm font-medium">Your Balance</div>
            <FundWalletButton walletAddress={wallet?.address} />
          </div>
          <div className="text-5xl font-bold tracking-tight">
            <span className="gradient-text">${formatted || "0.00"}</span>
          </div>
          <button
            onClick={refresh}
            className="text-[rgb(0,212,255)] text-sm mt-4 hover:text-[rgb(0,180,220)] transition-colors flex items-center gap-1.5 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Payment Requests */}
        <PaymentRequests wallet={wallet} userEmail={userEmail} onRefresh={refresh} />

        {/* Tab Switcher */}
        <div className="clay-card p-1.5 flex">
          <button
            onClick={() => setActiveTab("send")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === "send"
                ? "bg-[rgb(0,212,255)] text-black"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={() => setActiveTab("request")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === "request"
                ? "bg-[rgb(0,212,255)] text-black"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <HandCoins className="w-4 h-4" />
            Request
          </button>
        </div>

        {/* Forms */}
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
        <SocialFeed address={wallet?.address} className="mt-6" />
      </div>
    </main>
  );
}
