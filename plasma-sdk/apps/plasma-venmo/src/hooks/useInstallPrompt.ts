"use client";

import { useEffect, useState } from "react";

interface PWAInstallWindow extends Window {
  triggerPWAInstall?: () => Promise<boolean>;
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) {
      return;
    }

    // Check if already installed
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (isInstalled) {
      return;
    }

    // Listen for installable event
    const handleInstallable = () => {
      setCanInstall(true);
    };

    window.addEventListener("pwa-installable", handleInstallable);

    // Listen for installed event
    const handleInstalled = () => {
      setCanInstall(false);
    };

    window.addEventListener("pwa-installed", handleInstalled);

    return () => {
      window.removeEventListener("pwa-installable", handleInstallable);
      window.removeEventListener("pwa-installed", handleInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const globalWindow = window as PWAInstallWindow;
    if (typeof globalWindow.triggerPWAInstall === "function") {
      const accepted = await globalWindow.triggerPWAInstall();
      if (accepted) {
        setCanInstall(false);
      }
    }
  };

  return { canInstall, promptInstall };
}
