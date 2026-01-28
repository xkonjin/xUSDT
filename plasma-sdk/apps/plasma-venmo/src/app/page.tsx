"use client";

import { useState, useEffect } from "react";
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
import { Send, HandCoins, RefreshCw, Shield, Zap, QrCode, ArrowDownLeft, UserPlus, Sparkles, TrendingUp, Eye, EyeOff } from "lucide-react";
import { SocialFeed } from "@/components/SocialFeed";
import { SentRequests } from "@/components/SentRequests";
import { useContacts } from "@/hooks/useContacts";

export default function HomePage() {
  const { user, authenticated, ready, wallet, login, logout } = usePlasmaWallet();
  const { balance, formatted, refresh } = useUSDT0Balance();
  const [activeTab, setActiveTab] = useState<"send" | "request">("send");
  const [showAddContact, setShowAddContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<import("@/components/ContactList").Contact | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const userEmail = user?.email?.address;
  
  // Fetch real contacts from API
  const { contacts, recentContacts, loading: contactsLoading, error: contactsError, updateLastPayment } = useContacts({
    address: wallet?.address,
    autoFetch: true,
  });

  // Handle sending to a contact
  const handleSendToContact = (contact: import("@/components/ContactList").Contact) => {
    setSelectedContact(contact);
    setActiveTab("send");
    setTimeout(() => {
      window.scrollTo({ top: 500, behavior: 'smooth' });
    }, 100);
  };

  // Handle successful payment - update contact's lastPayment
  const handlePaymentSuccess = (recipientAddress: string) => {
    updateLastPayment(recipientAddress);
    setSelectedContact(null);
  };
  
  // Get quick send contacts: favorites first, then recent, limit to 6
  const quickSendContacts = [
    ...contacts.filter(c => c.isFavorite),
    ...recentContacts.filter(c => !c.isFavorite),
  ].slice(0, 6);

  // Handle refresh with animation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-plenmo-500/30 border-t-plenmo-500 animate-spin" />
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-plenmo-500/20 blur-xl animate-pulse" />
          </div>
          <div className="text-center">
            <span className="text-white/70 font-body text-lg">Loading Plenmo</span>
            <div className="flex items-center justify-center gap-1 mt-2">
              <div className="w-2 h-2 rounded-full bg-plenmo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-plenmo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-plenmo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-10 p-8 bg-gradient-to-b from-[#0a0a0f] via-[#0a0a0f] to-[#0f1a0f]">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-plenmo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-plenmo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plenmo-500/10 border border-plenmo-500/20 text-plenmo-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Zero fees, instant transfers
          </div>
          <h1 className="text-6xl md:text-7xl font-heading font-bold mb-6 tracking-tight">
            <span className="gradient-text">Plenmo</span>
          </h1>
          <p className="text-white/70 text-xl md:text-2xl max-w-lg mx-auto leading-relaxed mb-3 font-body">
            Pay anyone instantly with zero fees.
          </p>
          <p className="text-white/40 text-base max-w-md mx-auto font-body">
            Simple payments. No crypto complexity.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm font-body relative z-10">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm">
            <Shield className="w-4 h-4 text-plenmo-500" />
            <span>Bank-grade security</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm">
            <Zap className="w-4 h-4 text-plenmo-400" />
            <span>Instant transfers</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span>Always free</span>
          </div>
        </div>

        <button 
          onClick={login} 
          className="relative group clay-button text-lg px-12 py-5 animate-pulse-glow z-10"
        >
          <span className="relative z-10">Get Started Free</span>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-plenmo-500 to-plenmo-400 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
        </button>

        <p className="text-white/30 text-sm font-body relative z-10">
          No signup fees. No hidden charges. Ever.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh pb-28 bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a]">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="flex items-center justify-between p-4 md:p-6 max-w-lg mx-auto">
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            <span className="gradient-text">Plenmo</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <QRCodeButton walletAddress={wallet?.address} username={userEmail} />
            <WalletManagerButton />
            <UserProfileButton user={user} walletAddress={wallet?.address} onLogout={logout} />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 space-y-5 pt-4">
        {/* Balance Card - Enhanced */}
        <div className="relative overflow-hidden clay-card p-6 md:p-8">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-plenmo-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-sm font-medium font-body">Your Balance</span>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/60"
                  aria-label={balanceVisible ? "Hide balance" : "Show balance"}
                >
                  {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              <FundWalletButton walletAddress={wallet?.address} />
            </div>
            
            <div className="clay-amount mb-5 transition-all duration-300">
              {balanceVisible ? `$${formatted || "0.00"}` : "••••••"}
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-plenmo-500 text-sm hover:text-plenmo-400 transition-colors flex items-center gap-1.5 font-medium font-body disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Contacts Grid - Enhanced */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/70 text-sm font-semibold font-body tracking-wide uppercase">Quick Send</h3>
            <button 
              onClick={() => setShowAddContact(true)}
              className="text-plenmo-500 text-xs hover:text-plenmo-400 transition-colors flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg hover:bg-plenmo-500/10"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
          
          {contactsLoading ? (
            <div className="contact-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="contact-item animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-white/10" />
                  <div className="h-3 w-12 bg-white/10 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : quickSendContacts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-white/60 text-sm mb-1 font-body font-medium">No contacts yet</p>
              <p className="text-white/30 text-xs mb-5 font-body">Add your first contact to start sending</p>
              <button 
                onClick={() => setShowAddContact(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-plenmo-500/10 border border-plenmo-500/20 text-plenmo-400 text-sm font-medium hover:bg-plenmo-500/20 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Contact
              </button>
            </div>
          ) : (
            <div className="contact-grid">
              {quickSendContacts.map((contact) => (
                <button 
                  key={contact.id} 
                  className="contact-item group"
                  onClick={() => handleSendToContact(contact)}
                >
                  <div className="relative">
                    <div className="clay-avatar group-hover:scale-105 transition-transform duration-200">
                      {contact.name?.charAt(0).toUpperCase() || contact.email?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-plenmo-500/20 opacity-0 group-hover:opacity-100 blur-lg transition-opacity" />
                  </div>
                  <span className="text-white/70 text-xs font-medium font-body truncate max-w-full mt-1 group-hover:text-white transition-colors">
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

        {/* Tab Switcher - Enhanced */}
        <div className="clay-tabs p-1.5" role="tablist" aria-label="Payment type">
          <button
            onClick={() => setActiveTab("send")}
            role="tab"
            aria-selected={activeTab === "send"}
            aria-controls="send-panel"
            className={`clay-tab ${activeTab === "send" ? "active" : ""}`}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={() => setActiveTab("request")}
            role="tab"
            aria-selected={activeTab === "request"}
            aria-controls="request-panel"
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
            contacts={contacts}
            contactsLoading={contactsLoading}
            onPaymentSuccess={handlePaymentSuccess}
            selectedContact={selectedContact}
            onClearSelectedContact={() => setSelectedContact(null)}
          />
        ) : (
          <RequestMoneyForm walletAddress={wallet?.address} userEmail={userEmail} onSuccess={refresh} />
        )}

        <PaymentLinks address={wallet?.address} onRefresh={refresh} />
        <TransactionHistory address={wallet?.address} />
        <SocialFeed address={wallet?.address} className="mt-5" />
      </div>

      {/* Bottom Action Bar - Enhanced */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom" aria-label="Quick actions">
        <div className="clay-action-bar max-w-lg mx-auto">
          <button 
            className="clay-action-button"
            aria-label="Request money"
            onClick={() => {
              setActiveTab("request");
              window.scrollTo({ top: 500, behavior: 'smooth' });
            }}
          >
            <ArrowDownLeft className="w-5 h-5" aria-hidden="true" />
            <span>Request</span>
          </button>
          <button 
            className="clay-action-button primary"
            aria-label="Send money"
            onClick={() => {
              setActiveTab("send");
              window.scrollTo({ top: 500, behavior: 'smooth' });
            }}
          >
            <Send className="w-5 h-5" aria-hidden="true" />
            <span>Send</span>
          </button>
          <button 
            className="clay-action-button"
            aria-label="Scan QR code"
            onClick={() => {
              const qrButton = document.querySelector('[data-qr-button]') as HTMLButtonElement;
              if (qrButton) qrButton.click();
            }}
          >
            <QrCode className="w-5 h-5" aria-hidden="true" />
            <span>Scan</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
