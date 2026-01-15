"use client";

/**
 * ShareSheet Component
 * 
 * Clay-style share options modal for sharing payment links.
 * Supports WhatsApp, SMS, Copy Link, and QR code options.
 */

import { useState, useEffect } from "react";
import { X, MessageCircle, Copy, QrCode, Check, Share2, Smartphone } from "lucide-react";
import QRCode from "qrcode";

interface ShareLink {
  participantId: string;
  participantName: string;
  amount: number;
  url: string;
}

interface ShareSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Bill title */
  billTitle: string;
  /** Share links for each participant */
  shareLinks: ShareLink[];
  /** Currently selected participant to share (optional - if not set, shares all) */
  selectedParticipantId?: string;
}

export function ShareSheet({
  isOpen,
  onClose,
  billTitle,
  shareLinks,
  selectedParticipantId,
}: ShareSheetProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrParticipant, setQrParticipant] = useState<ShareLink | null>(null);

  // Get links to display
  const linksToShow = selectedParticipantId
    ? shareLinks.filter(l => l.participantId === selectedParticipantId)
    : shareLinks;

  // Generate QR code
  async function generateQR(link: ShareLink) {
    try {
      const qrDataUrl = await QRCode.toDataURL(link.url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#1E293B',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
      setQrParticipant(link);
      setShowQrModal(true);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }

  // Copy link to clipboard
  async function copyLink(link: ShareLink) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.participantId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = link.url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(link.participantId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  // Share via WhatsApp
  function shareWhatsApp(link: ShareLink) {
    const message = encodeURIComponent(
      `Hey ${link.participantName}! 🧾\n\nYou owe $${link.amount.toFixed(2)} for "${billTitle}".\n\nPay here: ${link.url}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }

  // Share via SMS
  function shareSMS(link: ShareLink) {
    const message = encodeURIComponent(
      `You owe $${link.amount.toFixed(2)} for "${billTitle}". Pay here: ${link.url}`
    );
    window.open(`sms:?body=${message}`, '_blank');
  }

  // Native share API
  async function nativeShare(link: ShareLink) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Splitzy - ${billTitle}`,
          text: `${link.participantName}, you owe $${link.amount.toFixed(2)} for "${billTitle}"`,
          url: link.url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  }

  // Check if native share is available
  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in-scale"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-b from-slate-50 to-white rounded-t-[32px] shadow-clay-lg overflow-hidden">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 font-heading">
                  Share Payment Links
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  {billTitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Participant Links */}
            <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {linksToShow.map((link) => (
                <div
                  key={link.participantId}
                  className="clay-card p-4 space-y-4"
                >
                  {/* Participant info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center text-white font-semibold">
                        {link.participantName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{link.participantName}</p>
                        <p className="text-sm text-slate-500">owes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-splitzy-600 font-heading">
                        ${link.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Share options grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {/* WhatsApp */}
                    <button
                      onClick={() => shareWhatsApp(link)}
                      className="share-option"
                    >
                      <div className="share-icon share-icon-whatsapp">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <span className="text-xs text-slate-600 font-medium">WhatsApp</span>
                    </button>

                    {/* SMS */}
                    <button
                      onClick={() => shareSMS(link)}
                      className="share-option"
                    >
                      <div className="share-icon share-icon-sms">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs text-slate-600 font-medium">SMS</span>
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={() => copyLink(link)}
                      className="share-option"
                    >
                      <div className="share-icon share-icon-copy">
                        {copiedId === link.participantId ? (
                          <Check className="w-6 h-6 text-white" />
                        ) : (
                          <Copy className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <span className="text-xs text-slate-600 font-medium">
                        {copiedId === link.participantId ? 'Copied!' : 'Copy'}
                      </span>
                    </button>

                    {/* QR Code */}
                    <button
                      onClick={() => generateQR(link)}
                      className="share-option"
                    >
                      <div className="share-icon share-icon-qr">
                        <QrCode className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs text-slate-600 font-medium">QR Code</span>
                    </button>
                  </div>

                  {/* Native share (if available) */}
                  {hasNativeShare && (
                    <button
                      onClick={() => nativeShare(link)}
                      className="w-full clay-button-secondary clay-button-small flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      More Options
                    </button>
                  )}

                  {/* Link preview */}
                  <div className="bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono truncate">
                    {link.url}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && qrCodeUrl && qrParticipant && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={() => setShowQrModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full animate-fade-in-scale">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 font-heading">
                  {qrParticipant.participantName}
                </h3>
                <p className="text-slate-500 text-sm">
                  Scan to pay ${qrParticipant.amount.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-clay flex items-center justify-center">
                <img 
                  src={qrCodeUrl} 
                  alt="Payment QR Code"
                  className="w-64 h-64"
                />
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full mt-4 clay-button"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default ShareSheet;
