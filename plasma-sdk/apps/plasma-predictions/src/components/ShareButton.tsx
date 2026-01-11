"use client";

import { useState } from "react";
import { Share2, Twitter, Copy, Check, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ShareButtonProps {
  title: string;
  text: string;
  url: string;
  outcome?: "YES" | "NO";
  price?: number;
  className?: string;
}

export function ShareButton({ title, text, url, outcome, price, className = "" }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${url}${url.includes("?") ? "&" : "?"}ref=share`;
  
  const twitterText = outcome && price 
    ? `I'm betting ${outcome} at ${(price * 100).toFixed(0)}¢ on "${title}" 🎯\n\nMake your prediction:`
    : `Check out this prediction market: "${title}"`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
    setIsOpen(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: twitterText,
          url: shareUrl,
        });
        setIsOpen(false);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleNativeShare}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition ${className}`}
      >
        <Share2 className="w-4 h-4 text-white/60" />
        <span className="text-sm text-white/80">Share</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute right-0 mt-2 w-56 liquid-metal-elevated rounded-xl overflow-hidden z-50"
            >
              <div className="p-2 space-y-1">
                <button
                  onClick={handleTwitterShare}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition"
                >
                  <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                  <span className="text-sm text-white">Share on X</span>
                </button>
                
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Link2 className="w-4 h-4 text-white/60" />
                  )}
                  <span className="text-sm text-white">
                    {copied ? "Copied!" : "Copy Link"}
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
