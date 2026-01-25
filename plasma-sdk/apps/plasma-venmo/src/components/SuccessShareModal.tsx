"use client";

import { useState } from "react";
import { share } from "@plasma-pay/share";
import {
  CheckCircle,
  X,
  Share2,
  Gift,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { ModalPortal } from "./ui/ModalPortal";

interface SuccessShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  recipient: string;
  txHash: string;
  referralLink?: string;
}

export function SuccessShareModal({
  isOpen,
  onClose,
  amount,
  recipient,
  txHash,
  referralLink,
}: SuccessShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!isOpen) return null;

  const txUrl = `https://scan.plasma.to/tx/${txHash}`;

  const handleShare = async (channel: "whatsapp" | "telegram" | "twitter") => {
    const text = `Just sent $${amount} instantly with zero fees on Plenmo! Try it yourself:`;
    const url = referralLink || "https://plasma.to";

    await share({ channel, text, url });
    setShared(true);
  };

  const handleCopyTx = async () => {
    await navigator.clipboard.writeText(txUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalPortal
      isOpen={true}
      onClose={onClose}
      zIndex={110}
      backdropClassName="bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md clay-card p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Payment Sent!</h2>
          <p className="text-white/50 mt-2">
            ${amount} sent to {recipient}
          </p>
        </div>

        {/* Transaction link */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-sm mb-1">Transaction</p>
              <p className="text-white font-mono text-sm truncate">
                {txHash.slice(0, 20)}...
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTx}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <a
                href={txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Share prompt */}
        {!shared ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-1">
                Share with friends and earn
              </p>
              <p className="text-[rgb(0,212,255)] font-semibold">
                $0.10 per signup
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleShare("whatsapp")}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#25D366]/20 hover:bg-[#25D366]/30 transition-colors"
              >
                <Share2 className="w-5 h-5 text-[#25D366]" />
                <span className="text-xs text-white/60">WhatsApp</span>
              </button>
              <button
                onClick={() => handleShare("telegram")}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#0088cc]/20 hover:bg-[#0088cc]/30 transition-colors"
              >
                <Share2 className="w-5 h-5 text-[#0088cc]" />
                <span className="text-xs text-white/60">Telegram</span>
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 transition-colors"
              >
                <Share2 className="w-5 h-5 text-[#1DA1F2]" />
                <span className="text-xs text-white/60">Twitter</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Gift className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-white/70">Thanks for sharing!</p>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </ModalPortal>
  );
}
