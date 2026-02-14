"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { BottomNav, type NavTab } from "@/components/BottomNav";
import {
  Send,
  HandCoins,
  RefreshCw,
  Shield,
  Zap,
  QrCode,
  ArrowDownLeft,
  UserPlus,
  Sparkles,
  TrendingUp,
  Eye,
  EyeOff,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { SocialFeed } from "@/components/SocialFeed";
import { SentRequests } from "@/components/SentRequests";
import { useContacts } from "@/hooks/useContacts";
import type { Contact } from "@/components/ContactList";

// Constants
const QUICK_SEND_LIMIT = 6;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export default function HomePage() {
  const { user, authenticated, ready, wallet, login, logout } =
    usePlasmaWallet();
  const {
    formatted,
    refresh,
    loading: balanceLoading,
  } = useUSDT0Balance();
  const [activeFormTab, setActiveFormTab] = useState<"send" | "request">(
    "send"
  );
  const [navTab, setNavTab] = useState<NavTab>("home");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for scroll targets
  const formSectionRef = useRef<HTMLDivElement>(null);

  const userEmail = user?.email?.address;

  // Fetch real contacts from API
  const {
    contacts,
    recentContacts,
    loading: contactsLoading,
    error: contactsError,
    updateLastPayment,
  } = useContacts({
    address: wallet?.address,
    autoFetch: true,
  });

  // Scroll to form section
  const scrollToForm = useCallback(() => {
    formSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // Handle sending to a contact
  const handleSendToContact = useCallback(
    (contact: Contact) => {
      setSelectedContact(contact);
      setActiveFormTab("send");
      setNavTab("send");
      requestAnimationFrame(() => {
        scrollToForm();
      });
    },
    [scrollToForm]
  );

  // Handle successful payment - update contact's lastPayment
  const handlePaymentSuccess = useCallback(
    (recipientAddress: string) => {
      updateLastPayment(recipientAddress);
      setSelectedContact(null);
    },
    [updateLastPayment]
  );

  // Clear selected contact
  const handleClearSelectedContact = useCallback(() => {
    setSelectedContact(null);
  }, []);

  // Get quick send contacts: favorites first, then recent, limit to QUICK_SEND_LIMIT
  const quickSendContacts = useMemo(() => {
    return [
      ...contacts.filter((c) => c.isFavorite),
      ...recentContacts.filter((c) => !c.isFavorite),
    ].slice(0, QUICK_SEND_LIMIT);
  }, [contacts, recentContacts]);

  // Handle refresh with animation
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [refresh]);

  // Handle QR button click
  const handleQRClick = useCallback(() => {
    const qrButton = document.querySelector(
      "[data-qr-button]"
    ) as HTMLButtonElement;
    if (qrButton) qrButton.click();
  }, []);

  if (!ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-plenmo-500/30 border-t-plenmo-500 animate-spin" />
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-plenmo-500/20 blur-xl animate-pulse" />
          </div>
          <div className="text-center">
            <span className="text-white/70 font-body text-lg">
              Loading Plenmo
            </span>
            <div className="flex items-center justify-center gap-1 mt-2">
              <div
                className="w-2 h-2 rounded-full bg-plenmo-500 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-plenmo-500 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-plenmo-500 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
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
          <div
            className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-plenmo-400/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
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

  // ---- Tab content renderers ----

  const renderHomeTab = () => (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Balance Card */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden clay-card p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-plenmo-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-sm font-medium font-body">
                Your Balance
              </span>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/60"
                aria-label={balanceVisible ? "Hide balance" : "Show balance"}
              >
                {balanceVisible ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>
            <FundWalletButton walletAddress={wallet?.address} />
          </div>

          <div className="text-5xl font-heading font-bold mb-5 transition-all duration-300 gradient-text tabular-nums">
            {balanceLoading ? (
              <div className="h-14 w-40 bg-white/10 rounded-lg animate-pulse" />
            ) : balanceVisible ? (
              `$${formatted || "0.00"}`
            ) : (
              "••••••"
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-plenmo-500 text-sm hover:text-plenmo-400 transition-colors flex items-center gap-1.5 font-medium font-body disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </motion.div>

      {/* Quick Actions Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setNavTab("send")}
          className="quick-action-btn"
          aria-label="Send money"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-600 flex items-center justify-center shadow-lg shadow-plenmo-500/25">
            <Send className="w-6 h-6 text-black" />
          </div>
          <span className="text-white/70 text-xs font-semibold font-body mt-2">
            Send
          </span>
        </button>
        <button
          onClick={() => {
            setActiveFormTab("request");
            setNavTab("send");
          }}
          className="quick-action-btn"
          aria-label="Request money"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <HandCoins className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/70 text-xs font-semibold font-body mt-2">
            Request
          </span>
        </button>
        <button
          onClick={() => {}}
          className="quick-action-btn"
          aria-label="Add funds"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/70 text-xs font-semibold font-body mt-2">
            Add Funds
          </span>
        </button>
      </motion.div>

      {/* Quick Contacts */}
      <motion.div variants={fadeUp} className="clay-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white/70 text-sm font-semibold font-body tracking-wide uppercase">
            Quick Send
          </h3>
          <button
            onClick={() => setShowAddContact(true)}
            className="text-plenmo-500 text-xs hover:text-plenmo-400 transition-colors flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg hover:bg-plenmo-500/10"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {contactsError && (
          <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Unable to load contacts. Please try again later.</span>
          </div>
        )}

        {contactsLoading ? (
          <div className="contact-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="contact-item animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
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
            <p className="text-white/60 text-sm mb-1 font-body font-medium">
              No contacts yet
            </p>
            <p className="text-white/30 text-xs mb-5 font-body">
              Add your first contact to start sending
            </p>
            <button
              onClick={() => setShowAddContact(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-plenmo-500/10 border border-plenmo-500/20 text-plenmo-400 text-sm font-medium hover:bg-plenmo-500/20 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        ) : (
          <div
            className="contact-grid"
            role="list"
            aria-label="Quick send contacts"
          >
            {quickSendContacts.map((contact) => (
              <button
                key={contact.id}
                className="contact-item group"
                onClick={() => handleSendToContact(contact)}
                aria-label={`Send to ${
                  contact.name || contact.email || "contact"
                }`}
              >
                <div className="relative">
                  <div className="clay-avatar group-hover:scale-105 transition-transform duration-200">
                    {contact.name?.charAt(0).toUpperCase() ||
                      contact.email?.charAt(0).toUpperCase() ||
                      "?"}
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
      </motion.div>

      {/* Payment Requests */}
      <motion.div variants={fadeUp}>
        <PaymentRequests
          wallet={wallet}
          userEmail={userEmail}
          onRefresh={refresh}
        />
      </motion.div>

      {/* Recent Activity Preview */}
      <motion.div variants={fadeUp}>
        <TransactionHistory address={wallet?.address} compact limit={5} />
      </motion.div>
    </motion.div>
  );

  const renderActivityTab = () => (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={fadeUp}>
        <TransactionHistory address={wallet?.address} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <SocialFeed address={wallet?.address} />
      </motion.div>
    </motion.div>
  );

  const renderSendTab = () => (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Tab Switcher */}
      <motion.div
        variants={fadeUp}
        ref={formSectionRef}
        className="clay-tabs p-1.5 scroll-mt-20"
        role="tablist"
        aria-label="Payment type"
      >
        <button
          onClick={() => setActiveFormTab("send")}
          role="tab"
          aria-selected={activeFormTab === "send"}
          aria-controls="send-panel"
          className={`clay-tab ${activeFormTab === "send" ? "active" : ""}`}
        >
          <Send className="w-4 h-4" />
          Send
        </button>
        <button
          onClick={() => setActiveFormTab("request")}
          role="tab"
          aria-selected={activeFormTab === "request"}
          aria-controls="request-panel"
          className={`clay-tab ${activeFormTab === "request" ? "active" : ""}`}
        >
          <HandCoins className="w-4 h-4" />
          Request
        </button>
      </motion.div>

      {/* Forms */}
      <motion.div
        variants={fadeUp}
        id={activeFormTab === "send" ? "send-panel" : "request-panel"}
        role="tabpanel"
      >
        {activeFormTab === "send" ? (
          <SendMoneyForm
            wallet={wallet}
            balance={formatted || undefined}
            onSuccess={refresh}
            contacts={contacts}
            contactsLoading={contactsLoading}
            onPaymentSuccess={handlePaymentSuccess}
            selectedContact={selectedContact}
            onClearSelectedContact={handleClearSelectedContact}
          />
        ) : (
          <RequestMoneyForm
            walletAddress={wallet?.address}
            userEmail={userEmail}
            onSuccess={refresh}
          />
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <PaymentRequests
          wallet={wallet}
          userEmail={userEmail}
          onRefresh={refresh}
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <SentRequests walletAddress={wallet?.address} onRefresh={refresh} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <PaymentLinks address={wallet?.address} onRefresh={refresh} />
      </motion.div>
    </motion.div>
  );

  const renderProfileTab = () => (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={fadeUp} className="clay-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="clay-avatar w-16 h-16 text-2xl">
            {userEmail?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-heading font-bold text-lg truncate">
              {userEmail?.split("@")[0] || "User"}
            </p>
            <p className="text-white/40 text-sm font-body truncate">
              {userEmail}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 min-h-[44px]">
            <span className="text-white/60 text-sm font-body">Wallet</span>
            <span className="text-white/80 text-sm font-mono truncate ml-4 max-w-[180px]">
              {wallet?.address
                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                : "---"}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 min-h-[44px]">
            <span className="text-white/60 text-sm font-body">Balance</span>
            <span className="text-plenmo-400 text-sm font-bold tabular-nums">
              ${formatted || "0.00"}
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="clay-card p-5 space-y-2">
        <button
          onClick={handleQRClick}
          className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-white/5 transition-colors min-h-[44px]"
        >
          <QrCode className="w-5 h-5 text-plenmo-500" />
          <span className="text-white/80 text-sm font-medium font-body">
            My QR Code
          </span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-red-500/10 transition-colors text-red-400 min-h-[44px]"
        >
          <span className="text-sm font-medium font-body">Sign Out</span>
        </button>
      </motion.div>
    </motion.div>
  );

  const renderTabContent = () => {
    switch (navTab) {
      case "home":
        return renderHomeTab();
      case "activity":
        return renderActivityTab();
      case "send":
        return renderSendTab();
      case "profile":
        return renderProfileTab();
    }
  };

  return (
    <main className="min-h-dvh pb-28 bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a]">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="flex items-center justify-between p-4 md:p-6 max-w-lg mx-auto">
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            <span className="gradient-text">Plenmo</span>
          </h1>
          <div className="flex items-center gap-1.5">
            <QRCodeButton
              walletAddress={wallet?.address}
              username={userEmail}
            />
            <WalletManagerButton />
            <UserProfileButton
              user={user}
              walletAddress={wallet?.address}
              onLogout={logout}
            />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={navTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav - Mobile only */}
      <BottomNav activeTab={navTab} onTabChange={setNavTab} />

      {/* Desktop fallback: old action bar (hidden on mobile since BottomNav takes over) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 hidden md:block safe-area-inset-bottom"
        aria-label="Quick actions"
      >
        <div className="clay-action-bar max-w-lg mx-auto">
          <button
            className="clay-action-button"
            aria-label="Request money"
            onClick={() => {
              setActiveFormTab("request");
              setNavTab("send");
            }}
          >
            <ArrowDownLeft className="w-5 h-5" aria-hidden="true" />
            <span>Request</span>
          </button>
          <button
            className="clay-action-button primary"
            aria-label="Send money"
            onClick={() => {
              setActiveFormTab("send");
              setNavTab("send");
            }}
          >
            <Send className="w-5 h-5" aria-hidden="true" />
            <span>Send</span>
          </button>
          <button
            className="clay-action-button"
            aria-label="Scan QR code"
            onClick={handleQRClick}
          >
            <QrCode className="w-5 h-5" aria-hidden="true" />
            <span>Scan</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
