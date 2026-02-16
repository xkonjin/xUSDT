"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
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
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
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

const stagger: import("framer-motion").Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fadeUp: import("framer-motion").Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
};

export default function HomePage() {
  const router = useRouter();
  const { user, authenticated, ready, wallet, login, logout } =
    usePlasmaWallet();
  const { formatted, refresh, loading: balanceLoading } = useUSDT0Balance();
  const [activeFormTab, setActiveFormTab] = useState<"send" | "request">(
    "send"
  );
  const [navTab, setNavTab] = useState<NavTab>("home");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAddContact, setShowAddContact] = useState(false);
  const [tabDirection, setTabDirection] = useState(0);

  // Refs for scroll targets and scroll reveal
  const formSectionRef = useRef<HTMLDivElement>(null);
  const requestsRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const socialFeedRef = useRef<HTMLDivElement>(null);

  // Scroll reveal hooks
  const requestsInView = useInView(requestsRef, {
    once: true,
    margin: "-50px",
  });
  const historyInView = useInView(historyRef, { once: true, margin: "-50px" });
  const socialFeedInView = useInView(socialFeedRef, {
    once: true,
    margin: "-50px",
  });

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

  // Keyboard shortcut handlers
  const handleShortcutSend = useCallback(() => {
    setActiveFormTab("send");
    setNavTab("send");
  }, []);

  const handleShortcutRequest = useCallback(() => {
    setActiveFormTab("request");
    setNavTab("send");
  }, []);

  const handleShortcutAddFunds = useCallback(() => {
    router.push("/add-funds");
  }, [router]);

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    onSend: handleShortcutSend,
    onRequest: handleShortcutRequest,
    onAddFunds: handleShortcutAddFunds,
  });

  if (!ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[rgb(var(--bg-primary))]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-full border-3 border-plenmo-500/20 border-t-plenmo-500 animate-spin" />
          <span className="text-white/50 font-body text-sm tracking-wide">
            Loading
          </span>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-10 p-8 bg-[rgb(var(--bg-primary))]">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plenmo-500/8 border border-plenmo-500/15 text-plenmo-400 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Zero fees, instant transfers
          </div>
          <h1 className="text-5xl md:text-6xl font-heading font-bold mb-5 tracking-tight text-white">
            Plenmo
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-md mx-auto leading-relaxed mb-2 font-body">
            Pay anyone instantly with zero fees.
          </p>
          <p className="text-white/35 text-sm max-w-sm mx-auto font-body">
            Simple payments. No crypto complexity.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-white/50 text-sm font-body">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
            <Shield className="w-3.5 h-3.5 text-plenmo-500" />
            <span>Bank-grade security</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
            <Zap className="w-3.5 h-3.5 text-plenmo-400" />
            <span>Instant transfers</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
            <TrendingUp className="w-3.5 h-3.5 text-plenmo-400" />
            <span>Always free</span>
          </div>
        </div>

        <motion.button
          onClick={login}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="clay-button text-base px-10 py-4 shadow-green-glow"
        >
          Get Started Free
        </motion.button>

        <p className="text-white/25 text-xs font-body">
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
      <motion.div variants={fadeUp} className="clay-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-sm font-medium font-body">
              Your Balance
            </span>
            <motion.button
              onClick={() => setBalanceVisible(!balanceVisible)}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/50"
              aria-label={balanceVisible ? "Hide balance" : "Show balance"}
            >
              {balanceVisible ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </motion.button>
          </div>
          <FundWalletButton walletAddress={wallet?.address} />
        </div>

        <div className="text-4xl md:text-5xl font-heading font-bold mb-5 text-white tabular-nums">
          {balanceLoading ? (
            <div className="h-12 w-36 bg-white/5 rounded-lg animate-pulse" />
          ) : balanceVisible ? (
            `$${formatted || "0.00"}`
          ) : (
            "••••••"
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-white/40 text-sm hover:text-white/60 transition-colors flex items-center gap-1.5 font-medium font-body disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </motion.div>

      {/* Quick Actions Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <motion.button
          onClick={() => setNavTab("send")}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center justify-center gap-2 min-h-[48px] p-3 rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          aria-label="Send money"
        >
          <Send className="w-5 h-5 text-plenmo-500" />
          <span className="text-white/60 text-xs font-medium font-body">
            Send
          </span>
        </motion.button>
        <motion.button
          onClick={() => {
            setActiveFormTab("request");
            setNavTab("send");
          }}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center justify-center gap-2 min-h-[48px] p-3 rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          aria-label="Request money"
        >
          <HandCoins className="w-5 h-5 text-white/60" />
          <span className="text-white/60 text-xs font-medium font-body">
            Request
          </span>
        </motion.button>
        <motion.button
          onClick={() => router.push("/add-funds")}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center justify-center gap-2 min-h-[48px] p-3 rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
          aria-label="Add funds"
        >
          <DollarSign className="w-5 h-5 text-white/60" />
          <span className="text-white/60 text-xs font-medium font-body">
            Add Funds
          </span>
        </motion.button>
      </motion.div>

      {/* Quick Contacts */}
      <motion.div variants={fadeUp} className="clay-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white/30 text-xs font-body uppercase tracking-widest">
            Quick Send
          </h3>
          <button
            onClick={() => setShowAddContact(true)}
            className="text-white/40 text-xs hover:text-white/60 transition-colors flex items-center gap-1.5 font-medium px-2 py-1 rounded-lg hover:bg-white/5"
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
                <div className="w-11 h-11 rounded-full bg-white/5" />
                <div className="h-3 w-12 bg-white/5 rounded mt-2" />
              </div>
            ))}
          </div>
        ) : quickSendContacts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-white/50 text-sm mb-1 font-body font-medium">
              No contacts yet
            </p>
            <p className="text-white/25 text-xs mb-5 font-body">
              Add your first contact to start sending
            </p>
            <motion.button
              onClick={() => setShowAddContact(true)}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/8 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Contact
            </motion.button>
          </div>
        ) : (
          <motion.div
            className="contact-grid"
            role="list"
            aria-label="Quick send contacts"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {quickSendContacts.map((contact) => (
              <motion.button
                key={contact.id}
                variants={fadeUp}
                whileTap={{ scale: 0.95 }}
                className="contact-item group"
                onClick={() => handleSendToContact(contact)}
                aria-label={`Send to ${
                  contact.name || contact.email || "contact"
                }`}
              >
                <div className="clay-avatar w-11 h-11 text-sm">
                  {contact.name?.charAt(0).toUpperCase() ||
                    contact.email?.charAt(0).toUpperCase() ||
                    "?"}
                </div>
                <span className="text-white/50 text-xs font-medium font-body truncate max-w-full mt-1 group-hover:text-white/70 transition-colors">
                  {contact.name || contact.email?.split("@")[0] || "Unknown"}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Payment Requests */}
      <motion.div
        ref={requestsRef}
        animate={requestsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <PaymentRequests
          wallet={wallet}
          userEmail={userEmail}
          onRefresh={refresh}
        />
      </motion.div>

      {/* Recent Activity Preview */}
      <motion.div
        ref={historyRef}
        animate={historyInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
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
      <motion.div
        ref={socialFeedRef}
        animate={
          socialFeedInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
        }
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
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
        <motion.button
          onClick={() => {
            setTabDirection(activeFormTab === "request" ? -1 : 0);
            setActiveFormTab("send");
          }}
          whileTap={{ scale: 0.97 }}
          role="tab"
          aria-selected={activeFormTab === "send"}
          aria-controls="send-panel"
          className={`clay-tab ${activeFormTab === "send" ? "active" : ""}`}
        >
          <Send className="w-4 h-4" />
          Send
        </motion.button>
        <motion.button
          onClick={() => {
            setTabDirection(activeFormTab === "send" ? 1 : 0);
            setActiveFormTab("request");
          }}
          whileTap={{ scale: 0.97 }}
          role="tab"
          aria-selected={activeFormTab === "request"}
          aria-controls="request-panel"
          className={`clay-tab ${activeFormTab === "request" ? "active" : ""}`}
        >
          <HandCoins className="w-4 h-4" />
          Request
        </motion.button>
      </motion.div>

      {/* Forms */}
      <motion.div variants={fadeUp}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeFormTab}
            initial={{ opacity: 0, x: tabDirection * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tabDirection * -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
        </AnimatePresence>
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
      className="space-y-4"
    >
      <motion.div variants={fadeUp} className="clay-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="clay-avatar w-14 h-14 text-xl">
            {userEmail?.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-heading font-semibold text-base truncate">
              {userEmail?.split("@")[0] || "User"}
            </p>
            <p className="text-white/35 text-sm font-body truncate">
              {userEmail}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] min-h-[44px]">
            <span className="text-white/40 text-sm font-body">Wallet</span>
            <span className="text-white/60 text-sm font-mono truncate ml-4 max-w-[180px]">
              {wallet?.address
                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                : "---"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] min-h-[44px]">
            <span className="text-white/40 text-sm font-body">Balance</span>
            <span className="text-white text-sm font-semibold tabular-nums">
              ${formatted || "0.00"}
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="clay-card p-4 space-y-1">
        <button
          onClick={handleQRClick}
          className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-white/[0.03] transition-colors min-h-[44px]"
        >
          <QrCode className="w-5 h-5 text-white/40" />
          <span className="text-white/60 text-sm font-medium font-body">
            My QR Code
          </span>
        </button>
        <motion.button
          onClick={logout}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-red-500/5 transition-colors text-red-400/80 min-h-[44px]"
        >
          <span className="text-sm font-medium font-body">Sign Out</span>
        </motion.button>
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
    <div className="min-h-dvh bg-[rgb(var(--bg-primary))] lg:flex">
      {/* Desktop Sidebar - lg+ only */}
      <DesktopSidebar
        activeTab={navTab}
        onTabChange={setNavTab}
        onSend={handleShortcutSend}
        onRequest={handleShortcutRequest}
        onAddFunds={handleShortcutAddFunds}
        balance={formatted || undefined}
        balanceLoading={balanceLoading}
        balanceVisible={balanceVisible}
        onToggleBalance={() => setBalanceVisible(!balanceVisible)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        userEmail={userEmail}
        walletAddress={wallet?.address}
        onLogout={logout}
      />

      {/* Main content area */}
      <main className="flex-1 min-h-dvh pb-28 lg:pb-8">
        {/* Header - hidden on lg+ (sidebar replaces it) */}
        <header className="sticky top-0 z-40 bg-[rgb(var(--bg-primary))]/95 backdrop-blur-sm border-b border-white/[0.06] lg:hidden">
          <div className="flex items-center justify-between p-4 md:p-6 max-w-lg md:max-w-2xl mx-auto">
            <h1 className="text-xl font-heading font-bold tracking-tight text-white">
              Plenmo
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

        {/* Desktop header - lg+ only, simpler */}
        <header className="hidden lg:block sticky top-0 z-40 bg-[rgb(var(--bg-primary))]/95 backdrop-blur-sm border-b border-white/[0.06]">
          <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-heading font-semibold text-white/70 capitalize">
              {navTab === "send"
                ? activeFormTab === "request"
                  ? "Request"
                  : "Send"
                : navTab}
            </h2>
            <div className="flex items-center gap-1.5">
              <QRCodeButton
                walletAddress={wallet?.address}
                username={userEmail}
              />
              <WalletManagerButton />
            </div>
          </div>
        </header>

        <div className="max-w-lg md:max-w-2xl lg:max-w-xl mx-auto px-4 pt-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={navTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Nav - Mobile/tablet only */}
        <BottomNav activeTab={navTab} onTabChange={setNavTab} />

        {/* Desktop action bar - md only (hidden on lg+ where sidebar takes over) */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 hidden md:block lg:hidden"
          aria-label="Quick actions"
        >
          <div className="bg-gradient-to-t from-[rgb(var(--bg-primary))] via-[rgb(var(--bg-primary))]/95 to-transparent pt-6 pb-4 px-4">
            <div className="flex gap-2 max-w-lg md:max-w-2xl mx-auto">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 border border-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/8 transition-colors min-h-[48px]"
                aria-label="Request money"
                onClick={handleShortcutRequest}
              >
                <ArrowDownLeft className="w-4 h-4" aria-hidden="true" />
                <span>Request</span>
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-plenmo-500 text-black text-sm font-semibold hover:bg-plenmo-400 transition-colors min-h-[48px]"
                aria-label="Send money"
                onClick={handleShortcutSend}
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Send</span>
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 border border-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/8 transition-colors min-h-[48px]"
                aria-label="Scan QR code"
                onClick={handleQRClick}
              >
                <QrCode className="w-4 h-4" aria-hidden="true" />
                <span>Scan</span>
              </button>
            </div>
          </div>
        </nav>
      </main>
    </div>
  );
}
