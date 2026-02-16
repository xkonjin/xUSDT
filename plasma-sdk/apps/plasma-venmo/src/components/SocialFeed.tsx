"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Avatar } from "./ui/Avatar";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Heart,
  MessageCircle,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Settings,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { ModalPortal } from "./ui/ModalPortal";

interface FeedItem {
  id: string;
  type: "payment" | "claim" | "request";
  user: {
    name: string;
    avatar?: string;
    address: string;
  };
  counterparty: {
    name: string;
    avatar?: string;
    address: string;
  };
  amount: string;
  memo?: string;
  timestamp: number;
  likes: number;
  isLiked: boolean;
  visibility: "public" | "friends" | "private";
}

interface FeedPagination {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

interface SocialFeedProps {
  address?: string;
  className?: string;
}

export const SocialFeed = memo(function SocialFeed({
  address,
  className = "",
}: SocialFeedProps) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<FeedPagination | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    shareTransactions: false,
    showAmount: false,
    showMemo: true,
  });

  // Fetch feed from API
  const fetchFeed = useCallback(
    async (offset = 0, append = false) => {
      try {
        if (offset === 0) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const params = new URLSearchParams({
          limit: "20",
          offset: offset.toString(),
        });

        if (address) {
          params.set("address", address);
        }

        const response = await fetch(`/api/feed?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch feed");
        }

        const data = await response.json();

        if (data.success) {
          if (append) {
            setFeed((prev) => [...prev, ...data.feed]);
          } else {
            setFeed(data.feed);
          }
          setPagination(data.pagination);
        } else {
          throw new Error(data.error || "Failed to fetch feed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [address]
  );

  useEffect(() => {
    // Load privacy settings from localStorage
    try {
      const stored = localStorage.getItem("plasma-privacy");
      if (stored) setPrivacySettings(JSON.parse(stored));
    } catch {
      /* ignore - private browsing or corrupted data */
    }

    // Fetch feed from API
    fetchFeed();
  }, [fetchFeed]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (pagination?.hasMore && !loadingMore) {
      fetchFeed(pagination.offset + pagination.limit, true);
    }
  }, [pagination, loadingMore, fetchFeed]);

  const savePrivacySettings = (settings: typeof privacySettings) => {
    setPrivacySettings(settings);
    try {
      localStorage.setItem("plasma-privacy", JSON.stringify(settings));
    } catch {
      /* ignore - private browsing */
    }
  };

  const handleLike = useCallback((id: string) => {
    setFeed((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isLiked: !item.isLiked,
              likes: item.isLiked ? item.likes - 1 : item.likes + 1,
            }
          : item
      )
    );
  }, []);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="clay p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-white/10 rounded mb-2" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          Activity Feed
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </h3>
        <button
          onClick={() => setShowPrivacyModal(true)}
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Privacy settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {!privacySettings.shareTransactions && (
        <div className="clay-card p-4 mb-4 text-center">
          <Lock className="w-8 h-8 text-white/30 mx-auto mb-2" />
          <p className="text-white/60 text-sm mb-3">
            Your transactions are private
          </p>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="text-plenmo-500 text-sm hover:underline"
          >
            Share with the community?
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="clay-card p-4 mb-4 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-400/60 mx-auto mb-2" />
          <p className="text-white/60 text-sm mb-3">{error}</p>
          <button
            onClick={() => fetchFeed()}
            className="text-plenmo-500 text-sm hover:underline flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && feed.length === 0 && !error && (
        <div className="clay-card p-8 text-center">
          <Globe className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 text-sm">
            No activity yet. Be the first to make a payment!
          </p>
        </div>
      )}

      <div className="space-y-3">
        {feed.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            onLike={handleLike}
            showAmount={privacySettings.showAmount}
          />
        ))}
      </div>

      {/* Load more button */}
      {pagination?.hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}

      {showPrivacyModal && (
        <PrivacySettingsModal
          settings={privacySettings}
          onSave={savePrivacySettings}
          onClose={() => setShowPrivacyModal(false)}
        />
      )}
    </div>
  );
});

const FeedCard = memo(function FeedCard({
  item,
  onLike,
  showAmount,
}: {
  item: FeedItem;
  onLike: (id: string) => void;
  showAmount: boolean;
}) {
  const getRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  // Determine display based on activity type
  const getActivityText = () => {
    switch (item.type) {
      case "payment":
        return "paid";
      case "claim":
        return "claimed from";
      case "request":
        return "requested from";
      default:
        return "paid";
    }
  };

  const isOutgoing = item.type === "payment" || item.type === "request";

  return (
    <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01]">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar name={item.user.name} size="md" />
          <div
            className={`absolute -bottom-1 -right-1 p-1 rounded-full ${
              isOutgoing ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {isOutgoing ? (
              <ArrowUpRight className="w-2.5 h-2.5 text-white" />
            ) : (
              <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{item.user.name}</span>
            <span className="text-white/40">{getActivityText()}</span>
            <span className="font-semibold text-white">
              {item.counterparty.name}
            </span>
          </div>

          {item.memo && (
            <p className="text-white/60 text-sm mt-1">{item.memo}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => onLike(item.id)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                item.isLiked
                  ? "text-red-400"
                  : "text-white/40 hover:text-red-400"
              }`}
            >
              <Heart
                className={`w-4 h-4 ${item.isLiked ? "fill-current" : ""}`}
              />
              {item.likes > 0 && <span>{item.likes}</span>}
            </button>

            <button className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </button>

            <span className="text-white/30 text-xs ml-auto tabular-nums">
              {getRelativeTime(item.timestamp)}
            </span>
          </div>
        </div>

        {showAmount && (
          <div
            className={`font-bold text-lg ${
              isOutgoing ? "text-red-400" : "text-green-400"
            }`}
          >
            {isOutgoing ? "-" : "+"}${item.amount}
          </div>
        )}
      </div>
    </div>
  );
});

interface PrivacySettings {
  shareTransactions: boolean;
  showAmount: boolean;
  showMemo: boolean;
}

interface PrivacySettingsModalProps {
  settings: PrivacySettings;
  onSave: (settings: PrivacySettings) => void;
  onClose: () => void;
}

function PrivacySettingsModal({
  settings,
  onSave,
  onClose,
}: PrivacySettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <ModalPortal
      isOpen={true}
      onClose={onClose}
      zIndex={110}
      backdropClassName="bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md clay-card p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2">Privacy Settings</h3>
        <p className="text-white/50 text-sm mb-6">
          Control what others can see about your activity
        </p>

        <div className="space-y-4">
          <ToggleOption
            icon={Globe}
            label="Share transactions publicly"
            description="Your payments appear in the community feed"
            enabled={localSettings.shareTransactions}
            onChange={(v) =>
              setLocalSettings((s) => ({ ...s, shareTransactions: v }))
            }
          />

          <ToggleOption
            icon={localSettings.showAmount ? Eye : EyeOff}
            label="Show amounts"
            description="Display payment amounts in feed"
            enabled={localSettings.showAmount}
            onChange={(v) => setLocalSettings((s) => ({ ...s, showAmount: v }))}
            disabled={!localSettings.shareTransactions}
          />

          <ToggleOption
            icon={MessageCircle}
            label="Show memos"
            description="Display payment notes in feed"
            enabled={localSettings.showMemo}
            onChange={(v) => setLocalSettings((s) => ({ ...s, showMemo: v }))}
            disabled={!localSettings.shareTransactions}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl clay-button text-black font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

function ToggleOption({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="p-2 rounded-xl bg-white/5">
        <Icon className="w-5 h-5 text-white/60" />
      </div>
      <div className="flex-1">
        <p className="text-white font-medium">{label}</p>
        <p className="text-white/40 text-sm">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        role="switch"
        aria-checked={enabled}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? "bg-plenmo-500" : "bg-white/20"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : ""
          }`}
        />
      </button>
    </div>
  );
}
