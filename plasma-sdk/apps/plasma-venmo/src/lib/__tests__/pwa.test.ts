import { isOnline, setupNetworkListeners } from '../pwa';

// Mock window APIs that might not be available in test environment
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    onLine: true,
    serviceWorker: {
      register: jest.fn(),
      getRegistrations: jest.fn(),
    },
    vibrate: jest.fn(),
    share: jest.fn(),
    matchMedia: jest.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
});

describe('pwa utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isOnline', () => {
    it('returns true when navigator.onLine is true', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true,
      });
      expect(isOnline()).toBe(true);
    });

    it('returns false when navigator.onLine is false', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });
      expect(isOnline()).toBe(false);
    });

    it('returns true in server-side environment', () => {
      // Test when typeof window is 'undefined'
      const originalWindow = global.window;
      // @ts-ignore - testing server-side scenario
      delete global.window;
      expect(isOnline()).toBe(true);
      global.window = originalWindow;
    });
  });

  describe('setupNetworkListeners', () => {
    it('sets up online and offline event listeners', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      const onOnline = jest.fn();
      const onOffline = jest.fn();
      
      const cleanup = setupNetworkListeners(onOnline, onOffline);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', onOnline);
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', onOffline);
      
      // Cleanup should be a function
      expect(typeof cleanup).toBe('function');
      
      cleanup();
      addEventListenerSpy.mockRestore();
    });

    it('returns cleanup function that removes event listeners', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const onOnline = jest.fn();
      const onOffline = jest.fn();
      
      const cleanup = setupNetworkListeners(onOnline, onOffline);
      
      cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', onOnline);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', onOffline);
      
      removeEventListenerSpy.mockRestore();
    });

    it('does not throw when called multiple times', () => {
      const onOnline = jest.fn();
      const onOffline = jest.fn();
      
      const cleanup1 = setupNetworkListeners(onOnline, onOffline);
      const cleanup2 = setupNetworkListeners(onOnline, onOffline);
      
      expect(() => {
        cleanup1();
        cleanup2();
      }).not.toThrow();
    });

    it('does nothing in server-side environment', () => {
      const originalWindow = global.window;
      // @ts-ignore - testing server-side scenario
      delete global.window;
      
      const onOnline = jest.fn();
      const onOffline = jest.fn();
      
      const cleanup = setupNetworkListeners(onOnline, onOffline);
      
      // Cleanup should still be a function
      expect(typeof cleanup).toBe('function');
      
      // Calling cleanup should not throw
      expect(() => cleanup()).not.toThrow();
      
      global.window = originalWindow;
    });
  });
});
