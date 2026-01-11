"use client";

import { useState, useEffect } from "react";
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
  X
} from "lucide-react";

interface FeedItem {
  id: string;
  type: "sent" | "received" | "request";
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

interface SocialFeedProps {
  address?: string;
  className?: string;
}

export function SocialFeed({ address, className = "" }: SocialFeedProps) {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    shareTransactions: false,
    showAmount: false,
    showMemo: true,
  });

  useEffect(() => {
    // Load privacy settings from localStorage
    const stored = localStorage.getItem("plasma-privacy");
    if (stored) {
      setPrivacySettings(JSON.parse(stored));
    }
    
    // Simulate loading feed
    setTimeout(() => {
      setFeed(generateMockFeed());
      setLoading(false);
    }, 500);
  }, []);

  const savePrivacySettings = (settings: typeof privacySettings) => {
    setPrivacySettings(settings);
    localStorage.setItem("plasma-privacy", JSON.stringify(settings));
  };

  function getRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  const handleLike = (id: string) => {
    setFeed(prev => prev.map(item => 
      item.id === id 
        ? { ...item, isLiked: !item.isLiked, likes: item.isLiked ? item.likes - 1 : item.likes + 1 }
        : item
    ));
  };

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
            className="text-[rgb(0,212,255)] text-sm hover:underline"
          >
            Share with the community?
          </button>
        </div>
      )}

      <div className="space-y-3">
        {feed.map((item) => (
          <FeedCard 
            key={item.id} 
            item={item} 
            onLike={() => handleLike(item.id)}
            showAmount={privacySettings.showAmount}
          />
        ))}
      </div>

      {showPrivacyModal && (
        <PrivacySettingsModal
          settings={privacySettings}
          onSave={savePrivacySettings}
          onClose={() => setShowPrivacyModal(false)}
        />
      )}
    </div>
  );
}

function FeedCard({ 
  item, 
  onLike,
  showAmount 
}: { 
  item: FeedItem; 
  onLike: () => void;
  showAmount: boolean;
}) {
  const getRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className="clay p-4 transition-all duration-200 hover:scale-[1.01]">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar name={item.user.name} size="md" />
          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${
            item.type === "sent" ? "bg-red-500" : "bg-green-500"
          }`}>
            {item.type === "sent" ? (
              <ArrowUpRight className="w-2.5 h-2.5 text-white" />
            ) : (
              <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{item.user.name}</span>
            <span className="text-white/40">
              {item.type === "sent" ? "paid" : "received from"}
            </span>
            <span className="font-semibold text-white">{item.counterparty.name}</span>
          </div>
          
          {item.memo && (
            <p className="text-white/60 text-sm mt-1">{item.memo}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            <button 
              onClick={onLike}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                item.isLiked ? "text-red-400" : "text-white/40 hover:text-red-400"
              }`}
            >
              <Heart className={`w-4 h-4 ${item.isLiked ? "fill-current" : ""}`} />
              {item.likes > 0 && <span>{item.likes}</span>}
            </button>
            
            <button className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors">
              <MessageCircle className="w-4 h-4" />
            </button>

            <span className="text-white/30 text-xs ml-auto">
              {getRelativeTime(item.timestamp)}
            </span>
          </div>
        </div>

        {showAmount && (
          <div className={`font-bold text-lg ${
            item.type === "sent" ? "text-red-400" : "text-green-400"
          }`}>
            {item.type === "sent" ? "-" : "+"}${item.amount}
          </div>
        )}
      </div>
    </div>
  );
}

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

function PrivacySettingsModal({ settings, onSave, onClose }: PrivacySettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md clay-card p-6 animate-fade-in-scale">
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
            onChange={(v) => setLocalSettings(s => ({ ...s, shareTransactions: v }))}
          />

          <ToggleOption
            icon={localSettings.showAmount ? Eye : EyeOff}
            label="Show amounts"
            description="Display payment amounts in feed"
            enabled={localSettings.showAmount}
            onChange={(v) => setLocalSettings(s => ({ ...s, showAmount: v }))}
            disabled={!localSettings.shareTransactions}
          />

          <ToggleOption
            icon={MessageCircle}
            label="Show memos"
            description="Display payment notes in feed"
            enabled={localSettings.showMemo}
            onChange={(v) => setLocalSettings(s => ({ ...s, showMemo: v }))}
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
    </div>
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
    <div className={`flex items-center gap-4 p-3 rounded-xl ${disabled ? "opacity-50" : ""}`}>
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
        className={`w-12 h-7 rounded-full transition-colors ${
          enabled ? "bg-[rgb(0,212,255)]" : "bg-white/20"
        }`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}

// Mock data generator
function generateMockFeed(): FeedItem[] {
  const names = ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Taylor", "Quinn", "Avery", "Blake"];
  const memos = [
    "Dinner last night",
    "Coffee",
    "Movie tickets",
    "Uber ride",
    "Birthday gift",
    "Lunch",
    "Groceries",
    "Concert tickets",
    "Road trip gas",
    "",
  ];

  return Array.from({ length: 10 }, (_, i) => ({
    id: `feed-${i}`,
    type: Math.random() > 0.5 ? "sent" : "received",
    user: {
      name: names[Math.floor(Math.random() * names.length)],
      address: `0x${Math.random().toString(16).slice(2, 10)}`,
    },
    counterparty: {
      name: names[Math.floor(Math.random() * names.length)],
      address: `0x${Math.random().toString(16).slice(2, 10)}`,
    },
    amount: (Math.random() * 100).toFixed(2),
    memo: memos[Math.floor(Math.random() * memos.length)],
    timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    likes: Math.floor(Math.random() * 20),
    isLiked: Math.random() > 0.7,
    visibility: "public",
  }));
}
