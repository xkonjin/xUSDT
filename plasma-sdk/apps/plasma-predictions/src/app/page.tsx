"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { TrendingUp, Zap, Shield, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useTrendingMarkets } from "@/hooks/useMarkets";
import { MarketCard, MarketCardSkeleton } from "@/components/MarketCard";
import { BettingModal } from "@/components/BettingModal";

const FEATURES = [
  {
    icon: Zap,
    title: "Zero Gas Fees",
    description: "All transactions are sponsored. Never pay for gas.",
  },
  {
    icon: Clock,
    title: "Instant Settlement",
    description: "2-4 second confirmation. No waiting for blocks.",
  },
  {
    icon: Shield,
    title: "Simple & Secure",
    description: "One signature to bet. Powered by Plasma chain.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { authenticated, login, ready } = usePlasmaWallet();
  const { data: trendingMarkets, isLoading } = useTrendingMarkets();

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      {/* Hero Section */}
      <section className="px-4 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Bet on{" "}
              <span className="text-gradient-purple">What Happens Next</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 mb-8 max-w-2xl mx-auto">
              The fastest prediction market. Zero gas fees. Instant settlement.
              Bet on politics, crypto, sports and more.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push("/predictions")}
                className="btn-primary text-lg px-8 py-3 w-full sm:w-auto"
              >
                Browse Markets
              </button>
              {!authenticated && ready && (
                <button
                  onClick={login}
                  className="btn-secondary text-lg px-8 py-3 w-full sm:w-auto"
                >
                  Sign Up Free
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * i }}
                className="stat-card p-6 text-center"
              >
                <feature.icon className="w-10 h-10 text-prediction-primary mx-auto mb-4" />
                <h3 className="text-white font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/60 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Markets */}
      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-prediction-primary" />
              Trending Markets
            </h2>
            <button
              onClick={() => router.push("/predictions")}
              className="text-prediction-primary text-sm font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <MarketCardSkeleton key={i} />
                ))
              : trendingMarkets?.map((market, i) => (
                  <MarketCard key={market.id} market={market} index={i} />
                ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="liquid-glass-elevated rounded-3xl p-8 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to make your first prediction?
            </h2>
            <p className="text-white/60 mb-6">
              Join thousands of predictors betting on the future. No crypto
              experience required.
            </p>
            <button
              onClick={() =>
                authenticated ? router.push("/predictions") : login()
              }
              className="btn-primary text-lg px-8 py-3"
            >
              {authenticated ? "Start Betting" : "Get Started Free"}
            </button>
          </motion.div>
        </div>
      </section>

      <BottomNav />
      <BettingModal />
    </div>
  );
}
