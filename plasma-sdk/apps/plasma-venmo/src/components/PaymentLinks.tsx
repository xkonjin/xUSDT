"use client";

/**
 * PaymentLinks Component
 * 
 * Displays a list of payment links created by the user.
 * Includes ability to create new links and copy URLs.
 */

import { useState, useEffect } from "react";
import { Link2, Copy, Check, Plus, ExternalLink, Trash2, Loader2 } from "lucide-react";
import type { Address } from "viem";

// Type for payment link
interface PaymentLink {
  id: string;
  creatorAddress: string;
  amount: number | null;
  currency: string;
  memo?: string;
  status: string;
  paidBy?: string;
  paidAt?: string;
  txHash?: string;
  expiresAt?: string;
  createdAt: string;
  url: string;
}

interface PaymentLinksProps {
  address: Address | undefined;
  onRefresh?: () => void;
}

export function PaymentLinks({ address, onRefresh }: PaymentLinksProps) {
  // State
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [newAmount, setNewAmount] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newExpires, setNewExpires] = useState("");

  // Fetch payment links
  useEffect(() => {
    if (!address) {
      setLinks([]);
      setLoading(false);
      return;
    }

    async function fetchLinks() {
      setLoading(true);
      try {
        const response = await fetch(`/api/payment-links?address=${address}`);
        if (response.ok) {
          const data = await response.json();
          setLinks(data.paymentLinks || []);
        }
      } catch (error) {
        console.error("Failed to fetch payment links:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLinks();
  }, [address]);

  // Copy link URL to clipboard
  async function copyLink(link: PaymentLink) {
    await navigator.clipboard.writeText(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Create new payment link
  async function createLink() {
    if (!address) return;

    setCreating(true);
    try {
      const response = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress: address,
          amount: newAmount || null,
          memo: newMemo || undefined,
          expiresInDays: newExpires ? parseInt(newExpires) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLinks([data.paymentLink, ...links]);
        setShowCreateForm(false);
        setNewAmount("");
        setNewMemo("");
        setNewExpires("");
        onRefresh?.();
      }
    } catch (error) {
      console.error("Failed to create payment link:", error);
    } finally {
      setCreating(false);
    }
  }

  // Cancel a payment link
  async function cancelLink(linkId: string) {
    if (!address) return;
    if (!confirm("Are you sure you want to cancel this payment link?")) return;

    try {
      const response = await fetch(`/api/payment-links/${linkId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorAddress: address }),
      });

      if (response.ok) {
        setLinks(links.map(l => 
          l.id === linkId ? { ...l, status: "cancelled" } : l
        ));
      }
    } catch (error) {
      console.error("Failed to cancel payment link:", error);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="liquid-glass rounded-3xl p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4">Payment Links</h2>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-16 liquid-glass-subtle rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="liquid-glass rounded-3xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Payment Links</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors text-[rgb(0,212,255)]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="liquid-glass-subtle rounded-2xl p-4 mb-4 space-y-3">
          <div>
            <label className="block text-white/50 text-xs mb-1">
              Amount (optional - leave empty for any amount)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="input-glass w-full pl-7 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/50 text-xs mb-1">
              Memo (optional)
            </label>
            <input
              type="text"
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="What's this payment for?"
              className="input-glass w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-1">
              Expires in (days, optional)
            </label>
            <input
              type="number"
              value={newExpires}
              onChange={(e) => setNewExpires(e.target.value)}
              placeholder="Never expires"
              min="1"
              className="input-glass w-full text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={createLink}
              disabled={creating}
              className="flex-1 btn-primary py-2 text-sm flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Create Link
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full liquid-glass-subtle flex items-center justify-center">
            <Link2 className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/40">No payment links yet</p>
          <p className="text-white/20 text-sm mt-1">
            Create one to receive payments
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className={`p-4 liquid-glass-subtle rounded-2xl transition-all duration-200 ${
                link.status === "paid" ? "border border-green-500/20" :
                link.status === "cancelled" || link.status === "expired" ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {link.amount !== null ? `$${link.amount}` : "Any amount"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      link.status === "active" ? "bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)]" :
                      link.status === "paid" ? "bg-green-500/20 text-green-400" :
                      "bg-white/10 text-white/40"
                    }`}>
                      {link.status}
                    </span>
                  </div>
                  
                  {link.memo && (
                    <p className="text-white/40 text-sm truncate mt-1">{link.memo}</p>
                  )}
                  
                  <div className="text-white/30 text-xs mt-1">
                    {new Date(link.createdAt).toLocaleDateString()}
                    {link.paidAt && ` • Paid ${new Date(link.paidAt).toLocaleDateString()}`}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  {link.status === "active" && (
                    <>
                      <button
                        onClick={() => copyLink(link)}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                        title="Copy link"
                      >
                        {copiedId === link.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-white/40" />
                        )}
                      </button>
                      <button
                        onClick={() => cancelLink(link.id)}
                        className="p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                        title="Cancel link"
                      >
                        <Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" />
                      </button>
                    </>
                  )}
                  
                  {link.txHash && (
                    <a
                      href={`https://scan.plasma.to/tx/${link.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                      title="View transaction"
                    >
                      <ExternalLink className="w-4 h-4 text-white/40" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

