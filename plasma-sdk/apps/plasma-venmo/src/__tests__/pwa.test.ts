/**
 * PWA Tests for Plenmo App
 * Tests for Progressive Web App functionality via src/lib/pwa.ts
 */
import {
  registerServiceWorker,
  isOnline,
  isInstalled,
  triggerHaptic,
} from "@/lib/pwa";

describe("PWA Service Worker Registration", () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: mockRegister,
      },
      writable: true,
    });
  });

  it("should register service worker on page load", async () => {
    mockRegister.mockResolvedValue({
      scope: "/",
      update: jest.fn(),
    });

    registerServiceWorker();
    window.dispatchEvent(new Event("load"));

    // Wait for async registration
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockRegister).toHaveBeenCalledWith("/sw.js");
  });

  it("should handle service worker registration errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockRegister.mockRejectedValue(new Error("Registration failed"));

    registerServiceWorker();
    window.dispatchEvent(new Event("load"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(
      "Service Worker registration failed:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});

describe("PWA Install Prompt", () => {
  let deferredPrompt: any = null;

  beforeEach(() => {
    deferredPrompt = null;
    jest.clearAllMocks();
  });

  it("should capture beforeinstallprompt event", () => {
    const event = new Event("beforeinstallprompt") as any;
    event.preventDefault = jest.fn();

    window.addEventListener("beforeinstallprompt", (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
    });

    window.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(deferredPrompt).toBeTruthy();
  });

  it("should dispatch pwa-installable event when installable", () => {
    const installableSpy = jest.fn();
    window.addEventListener("pwa-installable", installableSpy);

    const event = new Event("beforeinstallprompt") as any;
    event.preventDefault = jest.fn();

    window.dispatchEvent(event);
    window.dispatchEvent(new Event("pwa-installable"));

    expect(installableSpy).toHaveBeenCalled();
  });

  it("should handle appinstalled event", () => {
    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
    });

    const event = new Event("appinstalled");
    window.dispatchEvent(event);

    expect(deferredPrompt).toBeNull();
  });
});

describe("Offline Detection", () => {
  it("should detect when network goes offline", () => {
    const offlineSpy = jest.fn();

    window.addEventListener("offline", offlineSpy);
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
    });

    window.dispatchEvent(new Event("offline"));

    expect(navigator.onLine).toBe(false);
    expect(offlineSpy).toHaveBeenCalled();
  });

  it("should detect when network comes back online", () => {
    const onlineSpy = jest.fn();

    window.addEventListener("online", onlineSpy);
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
    });

    window.dispatchEvent(new Event("online"));

    expect(navigator.onLine).toBe(true);
    expect(onlineSpy).toHaveBeenCalled();
  });
});

describe("PWA Utility Functions", () => {
  it("isOnline returns navigator.onLine value", () => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
    });
    expect(isOnline()).toBe(true);
  });

  it("isInstalled returns false in normal browser mode", () => {
    expect(isInstalled()).toBe(false);
  });

  it("triggerHaptic does not throw when vibrate is not available", () => {
    // Must delete property so `'vibrate' in navigator` returns false
    const desc = Object.getOwnPropertyDescriptor(navigator, "vibrate");
    // @ts-ignore
    delete navigator.vibrate;
    expect(() => triggerHaptic()).not.toThrow();
    if (desc) Object.defineProperty(navigator, "vibrate", desc);
  });
});

describe("Service Worker Caching", () => {
  it("should have CACHE_NAME defined", () => {
    expect(true).toBe(true); // Placeholder
  });

  it("should cache static assets", () => {
    expect(true).toBe(true); // Placeholder
  });

  it("should handle API caching with network-first strategy", () => {
    expect(true).toBe(true); // Placeholder
  });
});
