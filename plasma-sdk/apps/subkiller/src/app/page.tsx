"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Mail,
  DollarSign,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.15)_0%,transparent_70%)] blur-3xl animate-float" />
        <div
          className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.1)_0%,transparent_70%)] blur-3xl animate-float"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full liquid-glass-subtle text-[rgb(0,212,255)] text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Powered by Plasma - Zero Gas Fees
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
            Kill Your{" "}
            <span className="gradient-text-shimmer">Subscriptions</span>
          </h1>

          <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Scan your email to discover hidden subscriptions draining your
            wallet. AI-powered detection finds them all - cancel with one click.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              size="lg"
              onClick={handleGetStarted}
              loading={isLoading}
              className="group min-w-[200px]"
            >
              <Mail className="w-5 h-5" />
              Scan My Email
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
            <span className="text-white/50 text-sm">
              One-time payment:{" "}
              <span className="text-white font-semibold">$0.99</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto pt-8">
            <div className="text-center p-4 rounded-2xl liquid-glass-subtle">
              <p className="text-3xl font-bold gradient-text">$847</p>
              <p className="text-sm text-white/50 mt-1">Avg. yearly savings</p>
            </div>
            <div className="text-center p-4 rounded-2xl liquid-glass-subtle">
              <p className="text-3xl font-bold gradient-text">12</p>
              <p className="text-sm text-white/50 mt-1">
                Avg. subscriptions found
              </p>
            </div>
            <div className="text-center p-4 rounded-2xl liquid-glass-subtle">
              <p className="text-3xl font-bold gradient-text">0</p>
              <p className="text-sm text-white/50 mt-1">Gas fees paid</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">
            How It Works
          </h2>
          <p className="text-center text-white/50 mb-12 max-w-xl mx-auto">
            Three simple steps to financial freedom
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card variant="interactive" className="p-8 group">
              <CardContent className="space-y-4 p-0">
                <div className="w-14 h-14 rounded-2xl liquid-glass-plasma flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-7 h-7 text-[rgb(0,212,255)]" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  1. Connect Gmail
                </h3>
                <p className="text-white/50 leading-relaxed">
                  Securely connect your Gmail account. We only read emails,
                  never send. Your data is never stored.
                </p>
              </CardContent>
            </Card>

            <Card variant="interactive" className="p-8 group">
              <CardContent className="space-y-4 p-0">
                <div className="w-14 h-14 rounded-2xl liquid-glass-plasma flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-7 h-7 text-[rgb(0,212,255)]" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  2. AI Scans
                </h3>
                <p className="text-white/50 leading-relaxed">
                  Our AI identifies subscription emails, categorizes them, and
                  estimates your monthly spending.
                </p>
              </CardContent>
            </Card>

            <Card variant="interactive" className="p-8 group">
              <CardContent className="space-y-4 p-0">
                <div className="w-14 h-14 rounded-2xl liquid-glass-plasma flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-7 h-7 text-[rgb(0,212,255)]" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  3. Cancel & Save
                </h3>
                <p className="text-white/50 leading-relaxed">
                  Review your subscriptions and cancel unwanted ones. Direct
                  links to cancellation pages included.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-lg">
                    Privacy First
                  </h4>
                  <p className="text-sm text-white/50 mt-1 leading-relaxed">
                    Emails are processed in your browser. We never store your
                    data. Read-only access, no sending.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl liquid-glass-plasma flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-[rgb(0,212,255)]" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-lg">
                    Zero Gas Fees
                  </h4>
                  <p className="text-sm text-white/50 mt-1 leading-relaxed">
                    Pay with USDT0 on Plasma chain. No Ethereum gas fees, ever.
                    Just $0.99, one-time.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <footer className="px-4 py-8 border-t border-white/10 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">SubKiller</span>
            <span className="text-xs text-white/40 px-2 py-0.5 rounded-full liquid-glass-subtle">
              by Plasma
            </span>
          </div>
          <p className="text-sm text-white/40">
            Kill subscriptions, save money. Zero gas fees.
          </p>
        </div>
      </footer>
    </div>
  );
}
