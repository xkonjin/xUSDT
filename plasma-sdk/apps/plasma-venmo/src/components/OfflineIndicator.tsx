"use client";

import { useEffect, useState } from 'react';
import { isOnline, setupNetworkListeners } from '@/lib/pwa';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    setOnline(isOnline());

    const cleanup = setupNetworkListeners(
      () => {
        setOnline(true);
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 3000);
      },
      () => {
        setOnline(false);
        setShowMessage(true);
      }
    );

    return cleanup;
  }, []);

  if (!showMessage && online) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div
        className={`clay-card px-4 py-2 flex items-center gap-2 ${
          online
            ? 'bg-green-500/20 border-green-500/30'
            : 'bg-orange-500/20 border-orange-500/30'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            online ? 'bg-green-400' : 'bg-orange-400'
          }`}
        />
        <span className="text-sm font-medium text-white">
          {online ? 'Back online' : 'No internet connection'}
        </span>
      </div>
    </div>
  );
}
