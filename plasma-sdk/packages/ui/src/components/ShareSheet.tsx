"use client";

import { useState } from "react";
import { X, Copy, Check, MessageCircle, Send, Mail, Share2, Twitter } from "lucide-react";

export type ShareChannel = "whatsapp" | "telegram" | "sms" | "email" | "twitter" | "copy" | "native";

export interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  url: string;
  onShare?: (channel: ShareChannel) => void;
}

const shareChannels = [
  { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
  { id: "telegram" as const, label: "Telegram", icon: Send, color: "#0088cc" },
  { id: "sms" as const, label: "Message", icon: MessageCircle, color: "#34C759" },
  { id: "email" as const, label: "Email", icon: Mail, color: "#EA4335" },
  { id: "twitter" as const, label: "X/Twitter", icon: Twitter, color: "#1DA1F2" },
];

export function ShareSheet({ isOpen, onClose, title, message, url, onShare }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleShare = async (channel: ShareChannel) => {
    onShare?.(channel);

    const fullMessage = `${message}\n\n${url}`;

    switch (channel) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, "_blank");
        break;
      case "telegram":
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`, "_blank");
        break;
      case "sms":
        window.location.href = `sms:?body=${encodeURIComponent(fullMessage)}`;
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(title || "Check this out")}&body=${encodeURIComponent(fullMessage)}`;
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMessage)}`, "_blank");
        break;
    }

    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShare?.("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
        onShare?.("native");
        onClose();
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="bg-[rgb(20,20,25)] rounded-t-3xl border-t border-white/10 p-6 pb-8 max-w-lg mx-auto">
          {/* Handle */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Share</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Share channels */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {shareChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleShare(channel.id)}
                className="flex flex-col items-center gap-2 group"
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${channel.color}20` }}
                >
                  <channel.icon className="w-6 h-6" style={{ color: channel.color }} />
                </div>
                <span className="text-xs text-white/60">{channel.label}</span>
              </button>
            ))}
          </div>

          {/* Copy link */}
          <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex-1 truncate text-white/60 text-sm">
              {url}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-[rgb(0,212,255)] text-black rounded-xl font-semibold hover:bg-[rgb(0,190,230)] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Native share button (if supported) */}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full mt-4 flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
            >
              <Share2 className="w-5 h-5 text-white/60" />
              <span className="text-white/60">More options...</span>
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}} />
    </>
  );
}
