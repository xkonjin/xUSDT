"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { 
  Zap, 
  Shield, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  ChevronRight,
  BarChart3,
  Gamepad2,
} from "lucide-react";
import { useDemoStore } from "@/lib/demo-store";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useTrendingMarkets } from "@/hooks/useMarkets";
import { MarketCard, MarketCardSkeleton } from "@/components/MarketCard";
import { BettingModal } from "@/components/BettingModal";

const FEATURES = [
  {
    icon: Zap,
    title: "Zero Gas Fees",
    description: "Every transaction is sponsored. Never pay for gas again.",
    color: "cyan",
  },
  {
    icon: Clock,
    title: "2-Second Settlement",
    description: "Instant confirmation on Plasma chain. No waiting.",
    color: "violet",
  },
  {
    icon: Shield,
    title: "Non-Custodial",
    description: "Your keys, your funds. Always in your control.",
    color: "magenta",
  },
];

const STATS = [
  { value: "$2.4M+", label: "Volume" },
  { value: "15K+", label: "Predictors" },
  { value: "500+", label: "Markets" },
  { value: "2s", label: "Settlement" },
];

function HeroSection() {
  const router = useRouter();
  const { authenticated, login, ready } = usePlasmaWallet();
  const { isDemoMode, enableDemoMode } = useDemoStore();
  
  const handleTryDemo = () => {
    enableDemoMode();
    router.push("/predictions");
  };

  return (
    <section className="relative px-4 pt-12 pb-20 sm:pt-20 sm:pb-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Main gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[rgba(var(--accent-violet),0.15)] via-[rgba(var(--accent-cyan),0.05)] to-transparent rounded-full blur-3xl" />
        
        {/* Floating orbs */}
        <motion.div 
          animate={{ y: [-20, 20, -20] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 left-[10%] w-32 h-32 bg-[rgba(var(--accent-cyan),0.1)] rounded-full blur-2xl"
        />
        <motion.div 
          animate={{ y: [20, -20, 20] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-60 right-[15%] w-40 h-40 bg-[rgba(var(--accent-violet),0.1)] rounded-full blur-2xl"
        />
      </div>

      <div className="relative max-w-5xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
        >
          <span className="badge-live">Live</span>
          <span className="text-sm text-white/60">Real markets from Polymarket</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
        >
          Predict the Future.
          <br />
          <span className="text-gradient">Win Big.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg sm:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          The fastest prediction market on any chain. Zero gas fees. 
          2-second settlement. Bet on politics, crypto, sports and more.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button
            onClick={() => router.push("/predictions")}
            className="btn-primary text-lg px-8 py-4 w-full sm:w-auto flex items-center justify-center gap-2 group"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Browse Markets</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          {!authenticated && !isDemoMode && ready && (
            <button
              onClick={handleTryDemo}
              className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto flex items-center justify-center gap-2 border-[rgba(var(--accent-cyan),0.3)] hover:border-[rgba(var(--accent-cyan),0.5)]"
            >
              <Gamepad2 className="w-5 h-5 text-[rgb(var(--accent-cyan))]" />
              <span>Try Demo - $10K Free</span>
            </button>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-3xl mx-auto"
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Why Plasma Predictions?
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Built different. Designed for speed, security, and the best UX.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="market-card p-8 text-center group"
            >
              {/* Icon */}
              <div className={`
                w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center
                ${feature.color === 'cyan' ? 'bg-[rgba(var(--accent-cyan),0.1)]' : ''}
                ${feature.color === 'violet' ? 'bg-[rgba(var(--accent-violet),0.1)]' : ''}
                ${feature.color === 'magenta' ? 'bg-[rgba(var(--accent-magenta),0.1)]' : ''}
                group-hover:scale-110 transition-transform duration-300
              `}>
                <feature.icon className={`
                  w-8 h-8
                  ${feature.color === 'cyan' ? 'text-[rgb(var(--accent-cyan))]' : ''}
                  ${feature.color === 'violet' ? 'text-[rgb(var(--accent-violet))]' : ''}
                  ${feature.color === 'magenta' ? 'text-[rgb(var(--accent-magenta))]' : ''}
                `} />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-white/50 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendingMarketsSection() {
  const router = useRouter();
  const { data: trendingMarkets, isLoading } = useTrendingMarkets();

  return (
    <section className="px-4 py-20">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[rgba(var(--accent-cyan),0.15)] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[rgb(var(--accent-cyan))]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Trending Now
              </h2>
            </div>
            <p className="text-white/50">The hottest markets right now</p>
          </div>
          
          <button
            onClick={() => router.push("/predictions")}
            className="btn-ghost flex items-center gap-2 text-[rgb(var(--accent-cyan))] hover:text-[rgb(var(--accent-cyan))]"
          >
            <span>View All Markets</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <MarketCardSkeleton key={i} />
              ))
            : trendingMarkets?.slice(0, 4).map((market, i) => (
                <MarketCard key={market.id} market={market} index={i} />
              ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const router = useRouter();
  const { authenticated, login } = usePlasmaWallet();

  return (
    <section className="px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative liquid-metal-elevated rounded-3xl p-10 sm:p-14 text-center overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-[rgba(var(--accent-violet),0.15)] rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[rgba(var(--accent-cyan),0.15)] rounded-full blur-3xl" />
          </div>
          
          <div className="relative">
            <Sparkles className="w-12 h-12 text-[rgb(var(--accent-cyan))] mx-auto mb-6" />
            
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to make your prediction?
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-md mx-auto">
              Join thousands of predictors. No crypto experience required. 
              Start with as little as $1.
            </p>
            
            <button
              onClick={() => authenticated ? router.push("/predictions") : login()}
              className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2"
            >
              {authenticated ? (
                <>
                  <BarChart3 className="w-5 h-5" />
                  <span>Start Betting</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Get Started Free</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <TrendingMarketsSection />
      <CTASection />
      <BottomNav />
      <BettingModal />
    </div>
  );
}
