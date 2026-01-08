"use client";

/**
 * Bill Detail Page
 * 
 * Shows bill details, participant shares, and payment links.
 */

import { useState, useEffect } from "react";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Copy, Check, ExternalLink, Loader2, Share2 } from "lucide-react";

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignments: { participantId: string }[];
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  color: string;
  share: number;
  paid: boolean;
  paidAt?: string;
  txHash?: string;
  paymentLinkId?: string;
}

interface BillData {
  id: string;
  title: string;
  creatorAddress: string;
  subtotal: number;
  tax: number;
  taxPercent: number;
  tip: number;
  tipPercent: number;
  total: number;
  status: string;
  items: BillItem[];
  participants: Participant[];
  createdAt: string;
}

export default function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Resolve params
  const [billId, setBillId] = useState<string | null>(null);
  
  useEffect(() => {
    params.then(p => setBillId(p.id));
  }, [params]);

  const { wallet } = usePlasmaWallet();
  
  // State
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  // Fetch bill details
  useEffect(() => {
    if (!billId) return;

    async function fetchBill() {
      try {
        const response = await fetch(`/api/bills/${billId}`);
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Bill not found');
          return;
        }
        const data = await response.json();
        setBill(data.bill);
      } catch (err) {
        setError('Failed to load bill');
      } finally {
        setLoading(false);
      }
    }

    fetchBill();
  }, [billId]);

  // Copy payment link
  async function copyLink(participantId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const url = `${baseUrl}/bill/${billId}/pay/${participantId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(participantId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Share bill
  async function shareBill() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const url = `${baseUrl}/bill/${billId}`;
    
    if (navigator.share) {
      await navigator.share({
        title: bill?.title || 'Bill Split',
        text: `Split this bill: ${bill?.total?.toFixed(2)} USDT0`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin" />
      </main>
    );
  }

  if (error || !bill) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Bill not found'}</p>
          <Link href="/" className="text-[rgb(0,212,255)] hover:underline">
            Go back
          </Link>
        </div>
      </main>
    );
  }

  const paidCount = bill.participants.filter(p => p.paid).length;
  const allPaid = paidCount === bill.participants.length;

  return (
    <main className="min-h-screen p-4 md:p-8 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-white">{bill.title}</h1>
            <p className="text-white/40 text-sm">
              {new Date(bill.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={shareBill}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Share2 className="w-5 h-5 text-white/60" />
        </button>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Total summary */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[rgb(0,212,255)]/20 to-purple-500/20 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm mb-1">Total Bill</p>
              <p className="text-4xl font-bold gradient-text">${bill.total.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-2 ${allPaid ? 'text-green-400' : 'text-yellow-400'}`}>
                {allPaid ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Settled</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">{paidCount}/{bill.participants.length} paid</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-4 rounded-2xl bg-white/5 space-y-2 text-sm">
          <div className="flex justify-between text-white/50">
            <span>Subtotal</span>
            <span>${bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.tax > 0 && (
            <div className="flex justify-between text-white/50">
              <span>Tax ({bill.taxPercent}%)</span>
              <span>${bill.tax.toFixed(2)}</span>
            </div>
          )}
          {bill.tip > 0 && (
            <div className="flex justify-between text-white/50">
              <span>Tip ({bill.tipPercent}%)</span>
              <span>${bill.tip.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            🍽️ Items
          </h2>
          <div className="space-y-2">
            {bill.items.map((item) => {
              // Get assigned participants
              const assignedParticipants = bill.participants.filter(p =>
                item.assignments.some(a => a.participantId === p.id)
              );

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white/5 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <span className="text-white">{item.name}</span>
                    {assignedParticipants.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {assignedParticipants.map(p => (
                          <span
                            key={p.id}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: p.color }}
                            title={p.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-white/50">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Participants & Payment */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            👥 Who Owes What
          </h2>
          <div className="space-y-3">
            {bill.participants.map((participant) => (
              <div
                key={participant.id}
                className={`p-4 rounded-2xl transition-all ${
                  participant.paid
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: participant.color }}
                    />
                    <div>
                      <p className="font-medium text-white">{participant.name}</p>
                      {participant.email && (
                        <p className="text-white/40 text-sm">{participant.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl gradient-text">
                      ${participant.share.toFixed(2)}
                    </p>
                    {participant.paid ? (
                      <div className="flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Paid
                      </div>
                    ) : (
                      <span className="text-white/40 text-xs">Pending</span>
                    )}
                  </div>
                </div>

                {/* Payment actions */}
                {!participant.paid && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => copyLink(participant.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                    >
                      {copiedId === participant.id ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <Link
                      href={`/bill/${billId}/pay/${participant.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] text-sm hover:bg-[rgb(0,212,255)]/30 transition-colors"
                    >
                      Pay Now
                    </Link>
                  </div>
                )}

                {/* Transaction link */}
                {participant.txHash && (
                  <a
                    href={`https://scan.plasma.to/tx/${participant.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-[rgb(0,212,255)] text-xs hover:underline"
                  >
                    View transaction
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

