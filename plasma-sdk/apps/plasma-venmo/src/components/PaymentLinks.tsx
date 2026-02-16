"use client";

/**
 * PaymentLinks Component
 *
 * Displays a list of payment links created by the user.
 * Includes ability to create new links and copy URLs.
 */

import { useState, useEffect } from "react";
import {
  Link2,
  Copy,
  Check,
  Plus,
  ExternalLink,
  Trash2,
  Loader2,
  DollarSign,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  Send as SendIcon,
  Share2,
} from "lucide-react";
import type { Address } from "viem";
import { PaymentLinkSkeleton } from "./ui/Skeleton";
import { EmptyState } from "./ui/EmptyState";
import { formatRelativeTime, copyToClipboard } from "@/lib/utils";

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
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [newAmount, setNewAmount] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newExpires, setNewExpires] = useState("");

  // Fetch payment links
  const fetchLinks = async () => {
    if (!address) {
      setLinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/payment-links?address=${address}`);
      if (!response.ok) {
        throw new Error("Failed to load payment links");
      }
      const data = await response.json();
      setLinks(data.paymentLinks || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load payment links"
      );
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Clear action error after timeout
  useEffect(() => {
    if (actionError) {
      const timeout = setTimeout(() => setActionError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [actionError]);

  // Copy link URL to clipboard
  async function copyLink(link: PaymentLink) {
    const success = await copyToClipboard(link.url);
    if (success) {
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setActionError("Failed to copy link. Please copy manually.");
    }
  }

  // Create new payment link
  async function createLink() {
    if (!address) return;

    setCreating(true);
    setActionError(null);
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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create payment link");
      }

      const data = await response.json();
      setLinks([data.paymentLink, ...links]);
      setShowCreateForm(false);
      setNewAmount("");
      setNewMemo("");
      setNewExpires("");
      onRefresh?.();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to create link. Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  // Cancel a payment link
  async function cancelLink(linkId: string) {
    if (!address) return;
    if (!confirm("Are you sure you want to cancel this payment link?")) return;

    setActionError(null);
    try {
      const response = await fetch(`/api/payment-links/${linkId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorAddress: address }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel payment link");
      }

      setLinks(
        links.map((l) => (l.id === linkId ? { ...l, status: "cancelled" } : l))
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to cancel link. Please try again."
      );
    }
  }

  // Share payment link via different channels
  function shareLink(
    link: PaymentLink,
    channel: "whatsapp" | "sms" | "telegram" | "native"
  ) {
    const amountText = link.amount !== null ? `$${link.amount}` : "any amount";
    const text = `Pay ${amountText} via Plenmo`;

    switch (channel) {
      case "whatsapp": {
        const url = `https://wa.me/?text=${encodeURIComponent(
          `${text}: ${link.url}`
        )}`;
        window.open(url, "_blank");
        break;
      }
      case "sms": {
        window.location.href = `sms:?body=${encodeURIComponent(
          `${text}: ${link.url}`
        )}`;
        break;
      }
      case "telegram": {
        const url = `https://t.me/share/url?url=${encodeURIComponent(
          link.url
        )}&text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
        break;
      }
      case "native": {
        if (navigator.share) {
          navigator.share({ title: text, url: link.url }).catch(() => {});
        }
        break;
      }
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="clay-card p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-plenmo-500" />
          Payment Links
        </h2>
        <div className="space-y-3">
          <PaymentLinkSkeleton />
          <PaymentLinkSkeleton />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="clay-card p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-plenmo-500" />
          Payment Links
        </h2>
        <div className="flex flex-col items-center gap-3 py-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchLinks}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="clay-card p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Link2 className="w-5 h-5 text-plenmo-500" />
          Payment Links
          {links.length > 0 && (
            <span className="text-sm bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
              {links.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors text-plenmo-500 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Link</span>
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="clay-card p-4 mb-4 space-y-3">
          <div>
            <label className="block text-white/50 text-xs mb-1">
              Amount (optional - leave empty for any amount)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                $
              </span>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="clay-input w-full pl-7 text-sm"
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
              className="clay-input w-full text-sm"
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
              className="clay-input w-full text-sm"
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
              className="flex-1 clay-button clay-button-primary py-2 text-sm flex items-center justify-center gap-2"
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

      {/* Action error alert */}
      {actionError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {/* Links list */}
      {links.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No payment links yet"
          description="Create a payment link to receive money from anyone"
          action={{
            label: "Create your first link",
            onClick: () => setShowCreateForm(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className={`p-4 clay-card transition-all duration-200 ${
                link.status === "paid"
                  ? "border border-green-500/20"
                  : link.status === "cancelled" || link.status === "expired"
                  ? "opacity-50"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {link.amount !== null ? `$${link.amount}` : "Any amount"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        link.status === "active"
                          ? "bg-plenmo-500/20 text-plenmo-500"
                          : link.status === "paid"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {link.status}
                    </span>
                  </div>

                  {link.memo && (
                    <p className="text-white/40 text-sm truncate mt-1">
                      {link.memo}
                    </p>
                  )}

                  <div className="text-white/30 text-xs mt-1">
                    Created {formatRelativeTime(link.createdAt)}
                    {link.paidAt &&
                      ` • Paid ${formatRelativeTime(link.paidAt)}`}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
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
                        onClick={() => shareLink(link, "whatsapp")}
                        className="p-2 rounded-xl hover:bg-green-500/10 transition-colors"
                        title="Share via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-white/40 hover:text-green-400" />
                      </button>
                      <button
                        onClick={() => shareLink(link, "telegram")}
                        className="p-2 rounded-xl hover:bg-blue-500/10 transition-colors"
                        title="Share via Telegram"
                      >
                        <SendIcon className="w-4 h-4 text-white/40 hover:text-blue-400" />
                      </button>
                      {typeof navigator !== "undefined" &&
                        "share" in navigator && (
                          <button
                            onClick={() => shareLink(link, "native")}
                            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                            title="Share"
                          >
                            <Share2 className="w-4 h-4 text-white/40" />
                          </button>
                        )}
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
