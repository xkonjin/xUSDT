"use client";

/**
 * Bill Split Home Page
 * 
 * Landing page and dashboard for the Bill Split app.
 * Shows user's bills and allows creating new ones.
 */

import { useState, useEffect } from "react";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import Link from "next/link";
import { Plus, Receipt, Users, DollarSign, CheckCircle, Clock, Loader2 } from "lucide-react";

interface BillSummary {
  id: string;
  title: string;
  total: number;
  status: string;
  participantCount: number;
  paidCount: number;
  createdAt: string;
}

export default function HomePage() {
  const { authenticated, ready, wallet, login, logout } = usePlasmaWallet();
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's bills
  useEffect(() => {
    if (!authenticated || !wallet?.address) {
      setBills([]);
      setLoading(false);
      return;
    }

    async function fetchBills() {
      if (!wallet?.address) return;
      
      try {
        const response = await fetch(`/api/bills?address=${wallet.address}`);
        if (response.ok) {
          const data = await response.json();
          setBills(data.bills || []);
        }
      } catch (error) {
        console.error("Failed to fetch bills:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBills();
  }, [authenticated, wallet?.address]);

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[rgb(0,212,255)] animate-spin" />
          <span className="text-white/50">Loading...</span>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[30%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.15)_0%,transparent_70%)] blur-3xl" />
          <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] blur-3xl" />
        </div>

        <div className="text-center relative z-10">
          <div className="text-6xl mb-6">🧾</div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            <span className="gradient-text">Splitzy</span>
          </h1>
          <p className="text-white/50 text-lg max-w-md mx-auto leading-relaxed">
            Split bills instantly with friends. Scan receipts with AI. Pay with zero gas fees.
          </p>
        </div>

        <button onClick={login} className="btn-primary relative z-10">
          Get Started
        </button>

        <div className="grid grid-cols-3 gap-8 mt-12 relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-[rgb(0,212,255)]" />
            </div>
            <p className="text-white/50 text-sm">Scan Receipts</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-white/50 text-sm">Assign Items</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-white/50 text-sm">Get Paid</p>
          </div>
        </div>

        <div className="text-white/40 text-sm mt-8 relative z-10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[rgb(0,212,255)]" />
          Powered by Plasma Chain - Zero gas fees
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 relative">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,212,255,0.08)_0%,transparent_70%)] blur-3xl" />
      </div>

      <header className="flex items-center justify-between mb-8 relative z-10">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <span className="text-3xl">🧾</span>
          <span className="gradient-text">Splitzy</span>
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-sm hidden sm:block px-3 py-1.5 rounded-full bg-white/5">
            {wallet?.address?.slice(0, 6)}...{wallet?.address?.slice(-4)}
          </span>
          <button
            onClick={logout}
            className="text-white/50 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-full hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Create new bill button */}
        <Link 
          href="/new" 
          className="block p-6 rounded-3xl bg-gradient-to-br from-[rgb(0,212,255)]/20 to-purple-500/20 border border-white/10 hover:border-white/20 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[rgb(0,212,255)] to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">New Bill</h2>
              <p className="text-white/50 text-sm">Scan a receipt or add items manually</p>
            </div>
          </div>
        </Link>

        {/* Bills list */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white/70">Your Bills</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <Receipt className="w-10 h-10 text-white/20" />
              </div>
              <p className="text-white/40">No bills yet</p>
              <p className="text-white/20 text-sm mt-1">
                Create your first bill to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <Link
                  key={bill.id}
                  href={`/bill/${bill.id}`}
                  className="block p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{bill.title}</h3>
                      <p className="text-white/40 text-sm">
                        {bill.participantCount} people • {new Date(bill.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold gradient-text">${bill.total.toFixed(2)}</p>
                      <div className="flex items-center gap-1 justify-end">
                        {bill.status === 'completed' ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            Settled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs">
                            <Clock className="w-3 h-3" />
                            {bill.paidCount}/{bill.participantCount} paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

