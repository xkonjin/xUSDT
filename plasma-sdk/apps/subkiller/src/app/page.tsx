"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { 
  Mail, 
  DollarSign, 
  Zap, 
  Shield, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  Settings,
  Target,
  Search,
  Eye,
  EyeOff
} from "lucide-react";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SavingsCounter } from "@/components/SavingsCounter";
import type { Subscription } from "@/types";

// Demo data for showcasing the app
const DEMO_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'demo-1',
    name: 'Netflix',
    sender: 'info@netflix.com',
    email: 'info@netflix.com',
    estimatedCost: 15.99,
    frequency: 'monthly',
    category: 'streaming',
    lastSeen: new Date(),
    firstSeen: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    emailCount: 24,
    unsubscribeUrl: 'https://netflix.com/account',
    logoUrl: 'https://logo.clearbit.com/netflix.com',
    status: 'active',
  },
  {
    id: 'demo-2',
    name: 'Spotify Premium',
    sender: 'no-reply@spotify.com',
    email: 'no-reply@spotify.com',
    estimatedCost: 10.99,
    frequency: 'monthly',
    category: 'streaming',
    lastSeen: new Date(),
    firstSeen: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    emailCount: 12,
    unsubscribeUrl: 'https://spotify.com/account',
    logoUrl: 'https://logo.clearbit.com/spotify.com',
    status: 'active',
  },
  {
    id: 'demo-3',
    name: 'Adobe Creative Cloud',
    sender: 'adobe@mail.adobe.com',
    email: 'adobe@mail.adobe.com',
    estimatedCost: 54.99,
    frequency: 'monthly',
    category: 'software',
    lastSeen: new Date(),
    firstSeen: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
    emailCount: 36,
    unsubscribeUrl: 'https://account.adobe.com',
    logoUrl: 'https://logo.clearbit.com/adobe.com',
    status: 'active',
  },
  {
    id: 'demo-4',
    name: 'YouTube Premium',
    sender: 'no-reply@youtube.com',
    email: 'no-reply@youtube.com',
    estimatedCost: 13.99,
    frequency: 'monthly',
    category: 'streaming',
    lastSeen: new Date(),
    firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    emailCount: 6,
    unsubscribeUrl: 'https://youtube.com/paid_memberships',
    logoUrl: 'https://logo.clearbit.com/youtube.com',
    status: 'active',
  },
  {
    id: 'demo-5',
    name: 'The New York Times',
    sender: 'nyt@nytimes.com',
    email: 'nyt@nytimes.com',
    estimatedCost: 17.00,
    frequency: 'monthly',
    category: 'news',
    lastSeen: new Date(),
    firstSeen: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    emailCount: 45,
    unsubscribeUrl: 'https://nytimes.com/subscription',
    logoUrl: 'https://logo.clearbit.com/nytimes.com',
    status: 'active',
  },
  {
    id: 'demo-6',
    name: 'Headspace',
    sender: 'hello@headspace.com',
    email: 'hello@headspace.com',
    estimatedCost: 12.99,
    frequency: 'monthly',
    category: 'fitness',
    lastSeen: new Date(),
    firstSeen: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    emailCount: 18,
    unsubscribeUrl: 'https://headspace.com/account',
    logoUrl: 'https://logo.clearbit.com/headspace.com',
    status: 'active',
  },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoSubscriptions, setDemoSubscriptions] = useState<Subscription[]>(DEMO_SUBSCRIPTIONS);
  const [demoSavings, setDemoSavings] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    // Check if Google OAuth is configured
    fetch('/api/auth/check-config')
      .then(res => res.json())
      .then(data => setOauthConfigured(data.configured))
      .catch(() => setOauthConfigured(false));
  }, []);

  const handleGetStarted = async () => {
    if (!oauthConfigured) {
      return;
    }
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    
    // Simulate scanning animation
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // After animation completes, show results
    setTimeout(() => {
      setIsScanning(false);
    }, 2500);
  };

  const handleCancelSubscription = (subscription: Subscription) => {
    // Update subscription status
    setDemoSubscriptions(prev => 
      prev.map(sub => 
        sub.id === subscription.id 
          ? { ...sub, status: 'cancelled' as const }
          : sub
      )
    );
    // Add to savings
    setDemoSavings(prev => prev + subscription.estimatedCost);
  };

  const totalMonthlySpend = demoSubscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.estimatedCost, 0);

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[10%] w-[600px] h-[600px] rounded-full bg-brand-500/10 blur-[128px] animate-float" />
        <div 
          className="absolute bottom-[-20%] right-[5%] w-[500px] h-[500px] rounded-full bg-brand-500/8 blur-[100px] animate-float" 
          style={{ animationDelay: '-3s' }} 
        />
        <div 
          className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-brand-600/5 blur-[80px] animate-float" 
          style={{ animationDelay: '-5s' }} 
        />
      </div>

      {/* Header */}
      <header className="relative z-20 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glass-red rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-brand-400" />
            </div>
            <span className="text-xl font-heading font-bold text-white">SubKiller</span>
          </div>
          
          {/* Mode Toggle */}
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className="glass-badge flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors"
          >
            {isDemoMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{isDemoMode ? 'Demo Mode' : 'Real Mode'}</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-brand-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            {isDemoMode ? 'Try Demo Mode' : 'Powered by Plasma'}
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-heading font-bold text-white tracking-tight">
            Kill Your{" "}
            <span className="gradient-text-shimmer">Subscriptions</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Scan your email to discover hidden subscriptions draining your wallet. 
            AI-powered detection finds them all — cancel with one click.
          </p>

          {/* CTA Section */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            {!oauthConfigured && oauthConfigured !== null && !isDemoMode ? (
              /* OAuth Setup Card */
              <div className="glass-elevated p-6 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl glass-red flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-heading font-semibold text-white">Setup Required</h3>
                    <p className="text-sm text-white/50">Google OAuth not configured</p>
                  </div>
                </div>
                
                <div className="glass-subtle p-4 rounded-xl mb-4">
                  <p className="text-sm text-white/70 mb-3">
                    Add these to your <code className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-mono">.env.local</code> file:
                  </p>
                  <div className="space-y-2 text-left">
                    <code className="block text-xs text-brand-400 font-mono bg-black/30 px-3 py-2 rounded">
                      GOOGLE_CLIENT_ID=your_client_id
                    </code>
                    <code className="block text-xs text-brand-400 font-mono bg-black/30 px-3 py-2 rounded">
                      GOOGLE_CLIENT_SECRET=your_secret
                    </code>
                  </div>
                </div>

                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-btn-secondary w-full flex items-center justify-center gap-2 py-3 rounded-xl"
                >
                  <Settings className="w-4 h-4" />
                  Get Google Cloud Credentials
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            ) : (
              /* Main CTA */
              <>
                {isDemoMode ? (
                  <button
                    onClick={handleDemoScan}
                    disabled={isScanning}
                    className="glass-btn min-w-[200px] group"
                  >
                    {isScanning ? (
                      <>
                        <Search className="w-5 h-5 animate-pulse" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Try Demo Scan
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleGetStarted}
                    disabled={isLoading || !oauthConfigured}
                    className="glass-btn min-w-[200px] group"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Scan My Email
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                )}
                <span className="text-white/40 text-sm">
                  {isDemoMode ? 'No sign-in required' : 'One-time payment: '}
                  {!isDemoMode && <span className="text-white font-semibold">$0.99</span>}
                </span>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-8">
            <div className="glass-subtle p-4 text-center">
              <p className="text-2xl md:text-3xl font-heading font-bold gradient-text">$847</p>
              <p className="text-xs md:text-sm text-white/40 mt-1">Avg. yearly savings</p>
            </div>
            <div className="glass-subtle p-4 text-center">
              <p className="text-2xl md:text-3xl font-heading font-bold gradient-text">12</p>
              <p className="text-xs md:text-sm text-white/40 mt-1">Avg. subs found</p>
            </div>
            <div className="glass-subtle p-4 text-center">
              <p className="text-2xl md:text-3xl font-heading font-bold gradient-text">0</p>
              <p className="text-xs md:text-sm text-white/40 mt-1">Gas fees paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scanning Animation */}
      {isScanning && (
        <div className="px-4 py-8 relative z-10">
          <div className="max-w-lg mx-auto glass-elevated p-8 scan-container">
            <div className="scan-line" />
            <div className="scan-glow" />
            
            {/* Floating email icons */}
            <div className="relative h-32 overflow-hidden">
              <span className="email-float">📧</span>
              <span className="email-float">📩</span>
              <span className="email-float">✉️</span>
              <span className="email-float">📨</span>
              <span className="email-float">💌</span>
            </div>

            <div className="text-center relative z-10">
              <h3 className="font-heading font-semibold text-white text-xl mb-2">
                Scanning Emails...
              </h3>
              <p className="text-white/50 mb-4">Finding hidden subscriptions</p>
              
              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-100 rounded-full"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <p className="text-sm text-brand-400 mt-2">{scanProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Demo Results Section */}
      {isDemoMode && !isScanning && (
        <div className="px-4 py-12 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Savings Counter */}
            {demoSavings > 0 && (
              <div className="mb-8">
                <SavingsCounter amount={demoSavings} />
              </div>
            )}

            {/* Summary Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-heading font-bold text-white">
                  Found {demoSubscriptions.length} Subscriptions
                </h2>
                <p className="text-white/50">
                  ${totalMonthlySpend.toFixed(2)}/month • ${(totalMonthlySpend * 12).toFixed(2)}/year
                </p>
              </div>
              <div className="glass-badge-red">
                <DollarSign className="w-4 h-4" />
                Demo Data
              </div>
            </div>

            {/* Subscription List */}
            <div className="space-y-4">
              {demoSubscriptions.map(subscription => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onCancel={handleCancelSubscription}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <div className="px-4 py-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-white mb-3">
              How It Works
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Three simple steps to financial freedom
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card p-6 group">
              <div className="w-14 h-14 rounded-2xl glass-red flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-7 h-7 text-brand-400" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white mb-2">
                1. Connect Gmail
              </h3>
              <p className="text-white/50 leading-relaxed">
                Securely connect your Gmail. We only read emails, never send. Your data is never stored.
              </p>
            </div>

            <div className="glass-card p-6 group">
              <div className="w-14 h-14 rounded-2xl glass-red flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-7 h-7 text-brand-400" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white mb-2">
                2. AI Scans
              </h3>
              <p className="text-white/50 leading-relaxed">
                Our AI identifies subscription emails, categorizes them, and estimates monthly spending.
              </p>
            </div>

            <div className="glass-card p-6 group">
              <div className="w-14 h-14 rounded-2xl glass-red flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <DollarSign className="w-7 h-7 text-brand-400" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-white mb-2">
                3. Cancel & Save
              </h3>
              <p className="text-white/50 leading-relaxed">
                Review your subscriptions and cancel unwanted ones. Direct links to cancellation pages.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="glass-elevated p-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-white text-lg">Privacy First</h4>
                  <p className="text-sm text-white/50 mt-1 leading-relaxed">
                    Emails processed in your browser. We never store your data. Read-only access only.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl glass-red flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-white text-lg">Zero Gas Fees</h4>
                  <p className="text-sm text-white/50 mt-1 leading-relaxed">
                    Pay with USDT0 on Plasma chain. No Ethereum gas fees, ever. Just $0.99, one-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 glass-red rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-brand-400" />
            </div>
            <span className="font-heading font-bold text-white">SubKiller</span>
            <span className="text-xs text-white/30 px-2 py-0.5 rounded-full glass-subtle">
              by Plasma
            </span>
          </div>
          <p className="text-sm text-white/30">
            Kill subscriptions, save money. Zero gas fees.
          </p>
        </div>
      </footer>
    </div>
  );
}
