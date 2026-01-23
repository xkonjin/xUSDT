"use client";

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

// Lazy load QR code component to reduce initial bundle size
const QRCodeComponent = dynamic(() => import('./QRCode'), {
  loading: () => (
    <div className="clay-skeleton w-64 h-64" />
  ),
  ssr: false,
});

type QRCodeProps = ComponentProps<typeof QRCodeComponent>;

export function QRCodeLazy(props: QRCodeProps) {
  return <QRCodeComponent {...props} />;
}

export default QRCodeLazy;
