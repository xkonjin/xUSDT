"use client";

import { useState } from "react";
import { Share2, X, MessageCircle, Send, Twitter } from "lucide-react";

export type ShareAction = "payment" | "bill_split" | "savings" | "stream" | "claim";

export interface SuccessShareProps {
  isVisible: boolean;
  onClose: () => void;
  action: ShareAction;
  amount?: number;
  recipientName?: string;
  shareUrl: string;
  onShare?: (channel: string) => void;
}

const actionMessages: Record<ShareAction, (amount?: number, recipient?: string) => string> = {
  payment: (amount, recipient) => 
    recipient 
      ? `Just sent $${amount?.toFixed(2)} to ${recipient} instantly with Plasma Pay - zero fees!`
      : `Just sent $${amount?.toFixed(2)} instantly with Plasma Pay - zero fees!`,
  bill_split: (amount) => 
    `Split a $${amount?.toFixed(2)} bill with friends in seconds using Splitzy!`,
  savings: (amount) => 
    `Cancelled subscriptions and saved $${amount?.toFixed(2)}/month with SubKiller!`,
  stream: (amount) => 
    `Created a $${amount?.toFixed(2)} payment stream with Plasma Stream!`,
  claim: (amount) => 
    `Just claimed $${amount?.toFixed(2)} on Plasma Pay!`,
};

const actionEmojis: Record<ShareAction, string> = {
  payment: "💸",
  bill_split: "🧾",
  savings: "🎯",
  stream: "📊",
  claim: "🎉",
};

export function SuccessSharePrompt({
  isVisible,
  onClose,
  action,
  amount,
  recipientName,
  shareUrl,
  onShare,
}: SuccessShareProps) {
  const [isSharing, setIsSharing] = useState(false);

  if (!isVisible) return null;

  const message = `${actionEmojis[action]} ${actionMessages[action](amount, recipientName)}`;

  const handleShare = async (channel: string) => {
    setIsSharing(true);
    onShare?.(channel);

    const fullMessage = `${message}\n\n${shareUrl}`;

    switch (channel) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, "_blank");
        break;
      case "telegram":
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`, "_blank");
        break;
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullMessage)}`, "_blank");
        break;
      case "native":
        if (navigator.share) {
          try {
            await navigator.share({ title: "Plasma Pay", text: message, url: shareUrl });
          } catch {
            // User cancelled
          }
        }
        break;
    }

    setIsSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-[rgb(25,25,30)] to-[rgb(20,20,25)] rounded-3xl border border-white/10 p-6 mb-4 animate-bounce-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/40" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[rgb(0,212,255)]/20 to-purple-500/20 flex items-center justify-center">
          <Share2 className="w-8 h-8 text-[rgb(0,212,255)]" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white text-center mb-2">
          Share your achievement!
        </h3>

        {/* Preview */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <p className="text-white/70 text-sm">{message}</p>
        </div>

        {/* Share buttons */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => handleShare("whatsapp")}
            disabled={isSharing}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#25D366]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="w-6 h-6 text-[#25D366]" />
            </div>
            <span className="text-xs text-white/50">WhatsApp</span>
          </button>

          <button
            onClick={() => handleShare("telegram")}
            disabled={isSharing}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#0088cc]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-6 h-6 text-[#0088cc]" />
            </div>
            <span className="text-xs text-white/50">Telegram</span>
          </button>

          <button
            onClick={() => handleShare("twitter")}
            disabled={isSharing}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#1DA1F2]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Twitter className="w-6 h-6 text-[#1DA1F2]" />
            </div>
            <span className="text-xs text-white/50">Twitter</span>
          </button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={() => handleShare("native")}
              disabled={isSharing}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6 text-white/60" />
              </div>
              <span className="text-xs text-white/50">More</span>
            </button>
          )}
        </div>

        {/* Skip button */}
        <button
          onClick={onClose}
          className="w-full py-3 text-white/40 hover:text-white/60 transition-colors text-sm"
        >
          Maybe later
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-in {
          0% { transform: translateY(100%) scale(0.9); opacity: 0; }
          50% { transform: translateY(-10px) scale(1.02); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}} />
    </div>
  );
}
