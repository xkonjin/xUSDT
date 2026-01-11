"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, Check, X, Download, Share2 } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";

interface QRCodeButtonProps {
  walletAddress?: string;
  username?: string;
}

export function QRCodeButton({ walletAddress, username }: QRCodeButtonProps) {
  const [showModal, setShowModal] = useState(false);

  if (!walletAddress) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-xl liquid-glass-subtle hover:bg-white/10 transition-colors"
        aria-label="Show QR Code"
      >
        <QrCode className="w-5 h-5 text-white/70" />
      </button>

      {showModal && (
        <QRCodeModal
          walletAddress={walletAddress}
          username={username}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface QRCodeModalProps {
  walletAddress: string;
  username?: string;
  onClose: () => void;
}

function QRCodeModal({ walletAddress, username, onClose }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const paymentUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/pay?to=${walletAddress}`;

  const handleCopy = async () => {
    const success = await copyToClipboard(walletAddress);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Pay me on Plasma Venmo",
          text: `Send me money on Plasma Venmo`,
          url: paymentUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await copyToClipboard(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `plasma-venmo-qr-${walletAddress.slice(0, 8)}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6 animate-fade-in-scale">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close QR code modal"
        >
          <X className="w-5 h-5 text-white/50" />
        </button>

        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">Scan to Pay</h3>
          <p className="text-white/50 text-sm mb-6">
            {username || "Share your QR code to receive payments"}
          </p>

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-4 inline-block mb-6">
            <QRCodeSVG
              id="qr-code-svg"
              value={paymentUrl}
              size={200}
              level="H"
              includeMargin={false}
              fgColor="#0a0a0a"
              bgColor="#ffffff"
            />
          </div>

          {/* Address */}
          <div className="bg-white/5 rounded-2xl p-4 mb-6">
            <p className="text-white/50 text-xs mb-1">Wallet Address</p>
            <p className="text-white font-mono text-sm break-all">
              {walletAddress}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleDownload}
              className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label="Download QR"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-scale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-scale {
          animation: fade-in-scale 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

interface QRCodeDisplayProps {
  walletAddress: string;
  amount?: string;
  memo?: string;
  size?: number;
}

export function QRCodeDisplay({ walletAddress, amount, memo, size = 150 }: QRCodeDisplayProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  let paymentUrl = `${baseUrl}/pay?to=${walletAddress}`;
  if (amount) paymentUrl += `&amount=${amount}`;
  if (memo) paymentUrl += `&memo=${encodeURIComponent(memo)}`;

  return (
    <div className="bg-white rounded-xl p-3 inline-block">
      <QRCodeSVG
        value={paymentUrl}
        size={size}
        level="M"
        includeMargin={false}
        fgColor="#0a0a0a"
        bgColor="#ffffff"
      />
    </div>
  );
}
