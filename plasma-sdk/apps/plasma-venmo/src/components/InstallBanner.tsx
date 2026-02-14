"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallBanner() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    await promptInstall();
    setIsInstalling(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-banner-dismissed", "true");
    window.dispatchEvent(new Event("pwa-banner-dismissed"));
  };

  // Only show on mobile devices
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (!canInstall || !isMobile) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#1DB954]/90 to-[#16a34a]/90 backdrop-blur-sm">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-sm text-white font-medium flex-1">
          Install Plenmo for the best experience
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="px-4 py-1.5 bg-white text-[#1DB954] font-semibold rounded-lg text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {isInstalling ? "Installing..." : "Install"}
          </button>

          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-white/90 hover:text-white text-sm font-medium"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
