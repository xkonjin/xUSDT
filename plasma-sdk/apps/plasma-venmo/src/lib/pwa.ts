/**
 * PWA utilities for service worker registration and install prompts
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Install prompt handling - using global function from layout
export async function promptInstall() {
  if (typeof window === 'undefined') {
    return false;
  }

  // Use the global function exposed in layout
  const globalWindow = window as any;
  if (typeof globalWindow.triggerPWAInstall === 'function') {
    return globalWindow.triggerPWAInstall();
  }

  return false;
}

export function isInstalled() {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if running as PWA
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Haptic feedback
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 30,
  };

  navigator.vibrate(patterns[type]);
}

// Share API
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}) {
  if (typeof window === 'undefined' || !('share' in navigator)) {
    // Fallback to clipboard
    if (data.url) {
      await navigator.clipboard.writeText(data.url);
      return true;
    }
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
}

// Network status
export function isOnline() {
  if (typeof window === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
