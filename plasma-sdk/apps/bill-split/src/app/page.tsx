"use client";

/**
 * Splitzy Home Page
 *
 * Landing page with claymorphism design.
 * Shows existing bills and create new bill CTA.
 * Uses localStorage for demo - no backend required.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Receipt,
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";
import {
  ParticipantAvatar,
  PARTICIPANT_COLORS,
} from "@/components/ParticipantChip";

interface StoredBill {
  id: string;
  title: string;
  total: number;
  participants: Array<{
    id: string;
    name: string;
    color: (typeof PARTICIPANT_COLORS)[number];
    share: number;
    paid: boolean;
  }>;
  createdAt: string;
  status: string;
}

export default function HomePage() {
  const [bills, setBills] = useState<StoredBill[]>([]);
  const [loading, setLoading] = useState(true);

  // Load bills from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("splitzy_bills");
    if (stored) {
      try {
        setBills(JSON.parse(stored));
      } catch {
        setBills([]);
      }
    }
    setLoading(false);
  }, []);

  // Delete bill
  function deleteBill(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this bill? This cannot be undone.")) return;
    const updated = bills.filter((b) => b.id !== id);
    setBills(updated);
    localStorage.setItem("splitzy_bills", JSON.stringify(updated));
  }

  // Calculate bill stats
  function getBillStats(bill: StoredBill) {
    const totalParticipants = bill.participants.length;
    const paidCount = bill.participants.filter((p) => p.paid).length;
    const isComplete = paidCount === totalParticipants;
    return { totalParticipants, paidCount, isComplete };
  }

  return (
    <main className="min-h-screen pb-8">
      {/* Header */}
      <header className="bg-[rgb(20,20,25)]/80 backdrop-blur-md border-b border-white/6 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center shadow-clay-teal">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text font-heading">
                Splitzy
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-splitzy-400 to-splitzy-600 flex items-center justify-center shadow-clay-lg animate-clay-bounce">
            <Receipt className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white font-heading mb-2">
            Split Bills Easily
          </h2>
          <p className="text-white/50 max-w-xs mx-auto">
            Scan receipts, divide costs, and share payment links in seconds
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex justify-center gap-3 flex-wrap">
          <div className="clay-badge flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-splitzy-500/20 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-splitzy-400" />
            </span>
            <span className="text-white/60">AI Receipt Scan</span>
          </div>
          <div className="clay-badge flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-violet-400" />
            </span>
            <span className="text-white/60">Smart Splitting</span>
          </div>
          <div className="clay-badge flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <span className="text-white/60">Easy Sharing</span>
          </div>
        </div>

        {/* Create New Bill CTA */}
        <Link
          href="/new"
          className="block clay-card clay-card-teal p-6 group hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center shadow-clay-teal group-hover:scale-110 transition-transform">
              <Plus className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-heading">
                New Bill
              </h3>
              <p className="text-white/50 text-sm">
                Scan a receipt or add items manually
              </p>
            </div>
          </div>
        </Link>

        {/* Bills List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white/80 font-heading">
            Your Bills
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-clay bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="clay-card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <Receipt className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/50 font-medium">No bills yet</p>
              <p className="text-white/40 text-sm mt-1">
                Create your first bill to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill) => {
                const { totalParticipants, paidCount, isComplete } =
                  getBillStats(bill);

                return (
                  <Link
                    key={bill.id}
                    href={`/bill/${bill.id}`}
                    className="block clay-card p-4 hover:scale-[1.01] transition-transform relative group"
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteBill(bill.id, e)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 max-md:opacity-60 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white font-heading truncate pr-8">
                          {bill.title}
                        </h4>
                        <p className="text-sm text-white/50 mt-1">
                          {new Date(bill.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>

                        {/* Participant avatars */}
                        <div className="flex items-center mt-3 -space-x-2">
                          {bill.participants.slice(0, 4).map((p) => (
                            <ParticipantAvatar
                              key={p.id}
                              name={p.name}
                              color={p.color}
                              size="sm"
                              className="border-2 border-[rgb(10,10,15)]"
                            />
                          ))}
                          {bill.participants.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/60 border-2 border-[rgb(10,10,15)]">
                              +{bill.participants.length - 4}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold gradient-text font-heading">
                          ${bill.total.toFixed(2)}
                        </p>
                        <div className="mt-2">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/15 px-2 py-1 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/15 px-2 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              {paidCount}/{totalParticipants} paid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
            <span className="w-2 h-2 rounded-full bg-splitzy-500" />
            <span>Splitzy - Bill Splitting Made Simple</span>
          </div>
        </div>
      </div>
    </main>
  );
}
