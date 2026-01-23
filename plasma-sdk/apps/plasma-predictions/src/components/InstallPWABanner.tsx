"use client";

import { useEffect, useState } from 'react';

export function InstallPWABanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if user dismissed banner before
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      return;
    }

    // Listen for installable event
    const handleInstallable = () => {
      setShowBanner(true);
    };

    window.addEventListener('pwa-installable', handleInstallable);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const globalWindow = window as any;
    
    if (typeof globalWindow.triggerPWAInstall === 'function') {
      const accepted = await globalWindow.triggerPWAInstall();
      if (accepted) {
        setShowBanner(false);
      } else {
        setIsInstalling(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-[#1a1030] border-2 border-purple-500/30 rounded-2xl p-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white mb-1">Install Pledictions</h3>
            <p className="text-sm text-white/70 mb-3">
              Get quick access and work offline. Install app for best experience.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isInstalling ? 'Installing...' : 'Install'}
              </button>

              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-white/60 hover:text-white font-medium rounded-lg transition-colors"
              >
                Not now
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-white/40 hover:text-white/60 transition-colors"
            aria-label="Close banner"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
