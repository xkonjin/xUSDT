'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Mail, DollarSign, Zap, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plasma-500/10 border border-plasma-500/30 text-plasma-400 text-sm">
            <Sparkles className="w-4 h-4" />
            Powered by Plasma - Zero Gas Fees
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white">
            Kill Your{' '}
            <span className="gradient-text">Subscriptions</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Scan your email to discover hidden subscriptions draining your wallet. 
            AI-powered detection finds them all - cancel with one click.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleGetStarted}
              loading={isLoading}
              className="group"
            >
              <Mail className="w-5 h-5 mr-2" />
              Scan My Email
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <span className="text-gray-500 text-sm">
              One-time payment: <span className="text-white font-semibold">$0.99</span>
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto pt-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-plasma-400">$847</p>
              <p className="text-sm text-gray-500">Avg. yearly savings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-plasma-400">12</p>
              <p className="text-sm text-gray-500">Avg. subscriptions found</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-plasma-400">0</p>
              <p className="text-sm text-gray-500">Gas fees paid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 py-16 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="p-6">
              <CardContent className="space-y-4 p-0">
                <div className="w-12 h-12 rounded-xl bg-plasma-500/20 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-plasma-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">1. Connect Gmail</h3>
                <p className="text-gray-400">
                  Securely connect your Gmail account. We only read emails, never send.
                  Your data is never stored.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6">
              <CardContent className="space-y-4 p-0">
                <div className="w-12 h-12 rounded-xl bg-plasma-500/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-plasma-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">2. AI Scans</h3>
                <p className="text-gray-400">
                  Our AI identifies subscription emails, categorizes them, and estimates
                  your monthly spending.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6">
              <CardContent className="space-y-4 p-0">
                <div className="w-12 h-12 rounded-xl bg-plasma-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-plasma-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">3. Cancel & Save</h3>
                <p className="text-gray-400">
                  Review your subscriptions and cancel unwanted ones. Direct links to
                  cancellation pages included.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Privacy First</h4>
                <p className="text-sm text-gray-400">
                  Emails are processed in your browser. We never store your data.
                  Read-only access, no sending.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-plasma-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-plasma-400" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Zero Gas Fees</h4>
                <p className="text-sm text-gray-400">
                  Pay with USDT0 on Plasma chain. No Ethereum gas fees, ever.
                  Just $0.99, one-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">SubKiller</span>
            <span className="text-xs text-gray-500">by Plasma</span>
          </div>
          <p className="text-sm text-gray-500">
            Kill subscriptions, save money. Zero gas fees.
          </p>
        </div>
      </footer>
    </div>
  );
}
