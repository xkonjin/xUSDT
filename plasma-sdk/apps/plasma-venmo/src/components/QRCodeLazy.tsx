"use client";

import dynamic from 'next/dynamic';

/**
 * Lazy-loaded QR Code components
 * Reduces initial bundle size by loading QR code library only when needed
 */

// Lazy load QR code button
export const QRCodeButton = dynamic(
  () => import('./QRCode').then(mod => mod.QRCodeButton),
  {
    loading: () => (
      <div className="clay-skeleton w-12 h-12 rounded-xl" />
    ),
    ssr: false,
  }
);

// Lazy load QR code display
export const QRCodeDisplay = dynamic(
  () => import('./QRCode').then(mod => mod.QRCodeDisplay),
  {
    loading: () => (
      <div className="clay-skeleton w-64 h-64 rounded-xl" />
    ),
    ssr: false,
  }
);
