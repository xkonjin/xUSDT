/**
 * SubKiller Dashboard Page
 *
 * Main dashboard for subscription scanning and management.
 * Features:
 * - Gmail email scanning for subscription detection
 * - AI-powered categorization and cost estimation
 * - One-time payment to unlock cancellation features
 * - Direct links to cancel subscriptions
 *
 * Authentication:
 * - NextAuth (Google OAuth) for Gmail access
 * - Privy wallet for USDT0 payments
 */

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { PaymentModal } from "@/components/PaymentModal";
import { ScanProgress } from "@/components/ScanProgress";
import { DollarSign, Scan, Filter, LogOut, CheckCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import type { Subscription } from "@/types";
import { calculateTotals } from "@/lib/subscription-detector";

// Conditionally import Privy hook - may not be available if not configured
type WalletState = {
  wallet: { address?: string } | null;
  authenticated: boolean;
  login: () => void;
};

let usePlasmaWallet: (() => WalletState) | null = null;

if (typeof window !== "undefined") {
  import("@plasma-pay/privy-auth")
    .then((privyAuth) => {
      usePlasmaWallet = privyAuth.usePlasmaWallet as () => WalletState;
    })
    .catch(() => {
      // Privy not available - wallet features will be disabled
    });
}

const useFallbackWallet = () => ({
  wallet: null,
  authenticated: false,
  login: () => {},
});

export default function Dashboard() {
  // NextAuth session for Gmail access
  const { data: session, status } = useSession();
  const router = useRouter();

  // Privy wallet for payments (may be null if not configured)
  const walletState = (usePlasmaWallet ?? useFallbackWallet)();
  const wallet = walletState?.wallet || null;
  const isWalletConnected = walletState?.authenticated || false;
  const connectWallet = walletState?.login || (() => {});

  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<
    "connecting" | "fetching" | "analyzing" | "complete"
  >("connecting");
  const [scanProgress, setScanProgress] = useState(0);
  const [emailsScanned, setEmailsScanned] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // Payment state
  const [hasPaid, setHasPaid] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<string>("all");

  // Redirect to home if not authenticated with Google
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // SUB-002: Check payment status from server on mount
  // Queries database instead of localStorage for security
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // Need wallet address to check payment status
      if (!wallet?.address) {
        return;
      }

      try {
        const response = await fetch(
          `/api/payment-status?address=${wallet.address}`
        );
        if (response.ok) {
          const data = await response.json();
          setHasPaid(data.hasPaid || false);
        }
      } catch (error) {
        console.error("Failed to check payment status:", error);
      }
    };

    checkPaymentStatus();
  }, [wallet?.address]);

  /**
   * Start scanning Gmail for subscription emails
   * Uses NextAuth access token to access Gmail API
   */
  const startScan = async () => {
    setIsScanning(true);
    setScanStage("connecting");
    setScanProgress(0);
    setEmailsScanned(0);
    setSubscriptions([]);

    try {
      // Stage 1: Connecting to Gmail
      setScanProgress(10);
      await new Promise((r) => setTimeout(r, 1000));

      // Stage 2: Fetching subscription emails
      setScanStage("fetching");
      setScanProgress(30);

      const scanResponse = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!scanResponse.ok) {
        throw new Error("Scan failed");
      }

      const scanData = await scanResponse.json();
      setEmailsScanned(scanData.scannedEmails);
      setScanProgress(60);

      // Stage 3: AI Analysis and Categorization
      setScanStage("analyzing");

      const categorizeResponse = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptions: scanData.subscriptions }),
      });

      const categorized = await categorizeResponse.json();
      setScanProgress(90);

      // Stage 4: Complete
      setScanStage("complete");
      setScanProgress(100);
      setSubscriptions(categorized.subscriptions);

      await new Promise((r) => setTimeout(r, 500));
    } catch {
      // Silent fail - scan can be retried
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Handle successful payment
   * SUB-002: Payment is persisted to database by /api/pay
   * We just update local state here - no more localStorage
   */
  const handlePaymentSuccess = (txHash: string) => {
    void txHash;
    setHasPaid(true);
    setShowPaymentModal(false);
    // Note: Payment is already persisted to database by /api/pay endpoint
    // No localStorage needed - server is source of truth
  };

  /**
   * Handle subscription cancellation action
   * Opens payment modal if not paid, otherwise opens unsubscribe URL
   */
  const handleCancelSubscription = (sub: Subscription) => {
    if (!hasPaid) {
      setShowPaymentModal(true);
      return;
    }
    // Open cancellation URL in new tab
    if (sub.unsubscribeUrl) {
      window.open(sub.unsubscribeUrl, "_blank");
    }
  };

  // Calculate spending totals
  const totals = calculateTotals(subscriptions);

  // Filter subscriptions by category
  const filteredSubscriptions = subscriptions.filter(
    (sub) => filter === "all" || sub.category === filter
  );

  // Get unique categories for filter buttons
  const categories = [...new Set(subscriptions.map((s) => s.category))];

  // Loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(0,212,255)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">SubKiller</h1>
            {session?.user?.email && (
              <span className="text-sm text-gray-400">
                {session.user.email}
              </span>
            )}
            {hasPaid && (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" />
                Pro
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <CardContent className="p-0 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[rgb(0,212,255)]/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[rgb(0,212,255)]" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Monthly Spending</p>
                <p className="text-2xl font-bold text-white">
                  ${totals.monthly.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardContent className="p-0 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Yearly Total</p>
                <p className="text-2xl font-bold text-white">
                  ${totals.yearly.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardContent className="p-0 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Scan className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Subscriptions Found</p>
                <p className="text-2xl font-bold text-white">
                  {subscriptions.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scanning Section */}
        {isScanning ? (
          <div className="mb-8">
            <ScanProgress
              stage={scanStage}
              progress={scanProgress}
              emailsScanned={emailsScanned}
              subscriptionsFound={subscriptions.length}
            />
          </div>
        ) : subscriptions.length === 0 ? (
          <Card className="mb-8 p-12 text-center">
            <CardContent className="p-0 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[rgb(0,212,255)]/20 flex items-center justify-center mx-auto">
                <Scan className="w-8 h-8 text-[rgb(0,212,255)]" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Ready to Scan
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Click below to scan your Gmail and discover all your hidden
                subscriptions. We will analyze your emails and categorize them
                automatically.
              </p>
              <Button size="lg" onClick={startScan}>
                <Scan className="w-5 h-5 mr-2" />
                Start Scanning
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter Bar */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filter:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={filter === "all" ? "primary" : "outline"}
                  onClick={() => setFilter("all")}
                >
                  All ({subscriptions.length})
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={filter === cat ? "primary" : "outline"}
                    onClick={() => setFilter(cat)}
                  >
                    {cat} (
                    {subscriptions.filter((s) => s.category === cat).length})
                  </Button>
                ))}
              </div>
              <div className="ml-auto">
                <Button size="sm" variant="outline" onClick={startScan}>
                  <Scan className="w-4 h-4 mr-2" />
                  Rescan
                </Button>
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="space-y-4">
              {filteredSubscriptions.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onCancel={handleCancelSubscription}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        subscriptionCount={subscriptions.length}
        estimatedSavings={totals.monthly * 0.3} // Assume 30% potential savings
        wallet={wallet as React.ComponentProps<typeof PaymentModal>["wallet"]}
        isWalletConnected={isWalletConnected}
        connectWallet={connectWallet}
      />
    </div>
  );
}
