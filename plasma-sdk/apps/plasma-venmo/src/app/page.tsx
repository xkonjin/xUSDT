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
import { Send, HandCoins, RefreshCw, Shield, Zap, QrCode, ArrowDownLeft, UserPlus } from "lucide-react";
import { SocialFeed } from "@/components/SocialFeed";
import { SentRequests } from "@/components/SentRequests";
import { useContacts } from "@/hooks/useContacts";

export default function HomePage() {
  const { user, authenticated, ready, wallet, login, logout } = usePlasmaWallet();
  const { balance, formatted, refresh } = useUSDT0Balance();
  const [activeTab, setActiveTab] = useState<"send" | "request">("send");
  const [showAddContact, setShowAddContact] = useState(false);
  
  const userEmail = user?.email?.address;
  
  // Fetch real contacts from API
  const { contacts, recentContacts, loading: contactsLoading, error: contactsError } = useContacts({
    address: wallet?.address,
    autoFetch: true,
  });
  
  // Get quick send contacts: favorites first, then recent, limit to 6
  const quickSendContacts = [
    ...contacts.filter(c => c.isFavorite),
    ...recentContacts.filter(c => !c.isFavorite),
  ].slice(0, 6);

  if (!ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-3 border-plenmo-500 border-t-transparent animate-spin" />
          <span className="text-white/50 font-body">Loading...</span>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-heading font-bold mb-4 tracking-tight">
            <span className="gradient-text">Plenmo</span>
          </h1>
          <p className="text-white/60 text-xl max-w-md mx-auto leading-relaxed mb-2 font-body">
            Pay anyone instantly. Zero fees.
          </p>
          <p className="text-white/40 text-base max-w-sm mx-auto font-body">
            No crypto jargon. Just simple payments.
          </p>
        </div>

        <div className="flex items-center gap-6 text-white/50 text-sm font-body">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-plenmo-500" />
            <span>Bank-grade security</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-plenmo-400" />
            <span>Instant transfers</span>
          </div>
        </div>

        <button onClick={login} className="clay-button text-lg px-10 py-5 animate-pulse-glow">
          Get Started Free
        </button>

        <p className="text-white/30 text-sm font-body">
          No signup fees. No hidden charges. Ever.
        </p>

        <div className="text-white/40 text-sm mt-8 flex items-center gap-2 font-body">
          <span className="w-2 h-2 rounded-full bg-plenmo-500 animate-pulse" />
          Powered by Plasma Chain
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-24">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <h1 className="text-2xl font-heading font-bold tracking-tight">
          <span className="gradient-text">Plenmo</span>
        </h1>
        <div className="flex items-center gap-2">
          <QRCodeButton walletAddress={wallet?.address} username={userEmail} />
          <WalletManagerButton />
          <UserProfileButton user={user} walletAddress={wallet?.address} onLogout={logout} />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 space-y-6">
        {/* Balance Card */}
        <div className="clay-card p-6 md:p-8">
          <div className="flex items-start justify-between mb-3">
            <div className="text-white/50 text-sm font-medium font-body">Your Balance</div>
            <FundWalletButton walletAddress={wallet?.address} />
          </div>
          <div className="clay-amount mb-4">
            ${formatted || "0.00"}
          </div>
          <button
            onClick={refresh}
            className="text-plenmo-500 text-sm hover:text-plenmo-400 transition-colors flex items-center gap-1.5 font-medium font-body"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Quick Contacts Grid */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/60 text-sm font-medium font-body">Quick Send</h3>
            <button 
              onClick={() => setShowAddContact(true)}
              className="text-plenmo-500 text-xs hover:text-plenmo-400 transition-colors flex items-center gap-1 font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
          
          {contactsLoading ? (
            <div className="contact-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="contact-item animate-pulse">
                  <div className="clay-avatar bg-white/10" />
                  <div className="h-3 w-12 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : quickSendContacts.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white/30" />
              </div>
              <p className="text-white/50 text-sm mb-1 font-body">No contacts yet</p>
              <p className="text-white/30 text-xs mb-4 font-body">Add your first contact to start sending quickly</p>
              <button 
                onClick={() => setShowAddContact(true)}
                className="clay-button-sm"
              >
                Add Contact
              </button>
            </div>
          ) : (
            <div className="contact-grid">
              {quickSendContacts.map((contact) => (
                <button 
                  key={contact.id} 
                  className="contact-item"
                  onClick={() => {
                    // Pre-fill send form with this contact
                    setActiveTab("send");
                    // TODO: Pass contact to SendMoneyForm
                  }}
                >
                  <div className="clay-avatar">
                    {contact.name?.charAt(0).toUpperCase() || contact.email?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <span className="text-white/70 text-xs font-medium font-body truncate max-w-full">
                    {contact.name || contact.email?.split("@")[0] || "Unknown"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment Requests - Incoming */}
        <PaymentRequests wallet={wallet} userEmail={userEmail} onRefresh={refresh} />
        
        {/* Sent Requests - Outgoing with Resend button */}
        <SentRequests walletAddress={wallet?.address} onRefresh={refresh} />

        {/* Tab Switcher */}
        <div className="clay-tabs">
          <button
            onClick={() => setActiveTab("send")}
            className={`clay-tab ${activeTab === "send" ? "active" : ""}`}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={() => setActiveTab("request")}
            className={`clay-tab ${activeTab === "request" ? "active" : ""}`}
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

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 clay-action-bar safe-area-inset-bottom">
        <button 
          className="clay-action-button"
          onClick={() => {
            setActiveTab("request");
            window.scrollTo({ top: 500, behavior: 'smooth' });
          }}
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span>Request</span>
        </button>
        <button 
          className="clay-action-button primary"
          onClick={() => {
            setActiveTab("send");
            window.scrollTo({ top: 500, behavior: 'smooth' });
          }}
        >
          <Send className="w-5 h-5" />
          <span>Send</span>
        </button>
        <button 
          className="clay-action-button"
          onClick={() => {
            // Open QR scanner or show QR code modal
            const qrButton = document.querySelector('[data-qr-button]') as HTMLButtonElement;
            if (qrButton) qrButton.click();
          }}
        >
          <QrCode className="w-5 h-5" />
          <span>Scan</span>
        </button>
      </div>
    </main>
  );
}
