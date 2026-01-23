import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';

// Mock PWA utilities
jest.mock('@/lib/pwa', () => ({
  isOnline: jest.fn(),
  setupNetworkListeners: jest.fn(),
}));

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when online by default', () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(true);

    render(<OfflineIndicator />);
    expect(screen.queryByText('Back online')).not.toBeInTheDocument();
    expect(screen.queryByText('No internet connection')).not.toBeInTheDocument();
  });

  it('does not render when offline initially (message timeout not triggered)', () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(false);
    setupNetworkListeners.mockReturnValue(jest.fn());

    render(<OfflineIndicator />);
    expect(screen.queryByText('Back online')).not.toBeInTheDocument();
    expect(screen.queryByText('No internet connection')).not.toBeInTheDocument();
  });

  it('shows online message when coming back online', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    // Simulate coming online
    expect(onOnlineCallback).not.toBeNull();
    if (onOnlineCallback) {
      onOnlineCallback();
    }
    
    await waitFor(() => {
      expect(screen.getByText('Back online')).toBeInTheDocument();
    });
  });

  it('shows offline message when going offline', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(true);
    let onOfflineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void, onOffline: () => void) => {
      onOfflineCallback = onOffline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    // Simulate going offline
    expect(onOfflineCallback).not.toBeNull();
    if (onOfflineCallback) {
      onOfflineCallback();
    }
    
    await waitFor(() => {
      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });
  });

  it('hides online message after 3 seconds', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    // Simulate coming online
    if (onOnlineCallback) {
      onOnlineCallback();
    }
    
    await waitFor(() => {
      expect(screen.getByText('Back online')).toBeInTheDocument();
    });
    
    // Wait for message to hide (3 seconds)
    await waitFor(
      () => {
        expect(screen.queryByText('Back online')).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('applies correct styling for online state', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    if (onOnlineCallback) {
      onOnlineCallback();
    }
    
    await waitFor(() => {
      const container = screen.getByText('Back online').closest('.clay-card');
      expect(container).toHaveClass('bg-green-500/20');
      expect(container).toHaveClass('border-green-500/30');
    });
  });

  it('applies correct styling for offline state', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(true);
    let onOfflineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void, onOffline: () => void) => {
      onOfflineCallback = onOffline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    if (onOfflineCallback) {
      onOfflineCallback();
    }
    
    await waitFor(() => {
      const container = screen.getByText('No internet connection').closest('.clay-card');
      expect(container).toHaveClass('bg-orange-500/20');
      expect(container).toHaveClass('border-orange-500/30');
    });
  });

  it('shows green indicator for online state', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(false);
    let onOnlineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void) => {
      onOnlineCallback = onOnline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    if (onOnlineCallback) {
      onOnlineCallback();
    }
    
    await waitFor(() => {
      const indicator = document.querySelector('.bg-green-400');
      expect(indicator).toBeInTheDocument();
    });
  });

  it('shows orange indicator for offline state', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(true);
    let onOfflineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void, onOffline: () => void) => {
      onOfflineCallback = onOffline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    if (onOfflineCallback) {
      onOfflineCallback();
    }
    
    await waitFor(() => {
      const indicator = document.querySelector('.bg-orange-400');
      expect(indicator).toBeInTheDocument();
    });
  });

  it('sets up network listeners on mount', () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(true);

    render(<OfflineIndicator />);
    
    expect(setupNetworkListeners).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('cleans up network listeners on unmount', () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(true);
    const cleanup = jest.fn();
    setupNetworkListeners.mockReturnValue(cleanup);

    const { unmount } = render(<OfflineIndicator />);
    
    unmount();
    
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('handles rapid online/offline switches', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(true);
    let onOnlineCallback: (() => void) | null = null;
    let onOfflineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void, onOffline: () => void) => {
      onOnlineCallback = onOnline;
      onOfflineCallback = onOffline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    // Go offline
    if (onOfflineCallback) {
      onOfflineCallback();
    }
    
    await waitFor(() => {
      expect(screen.getByText('No internet connection')).toBeInTheDocument();
    });
    
    // Come back online
    if (onOnlineCallback) {
      onOnlineCallback();
    }
    
    await waitFor(() => {
      expect(screen.getByText('Back online')).toBeInTheDocument();
      expect(screen.queryByText('No internet connection')).not.toBeInTheDocument();
    });
  });

  it('has correct positioning', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(false);
    let onOfflineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void, onOffline: () => void) => {
      onOfflineCallback = onOffline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    if (onOfflineCallback) {
      onOfflineCallback();
    }
    
    await waitFor(() => {
      const container = screen.getByText('No internet connection').closest('div');
      expect(container).toHaveClass('fixed');
      expect(container).toHaveClass('top-4');
      expect(container).toHaveClass('left-1/2');
      expect(container).toHaveClass('-translate-x-1/2');
    });
  });

  it('applies transition classes', async () => {
    const { isOnline, setupNetworkListeners } = require('@/lib/pwa');
    isOnline.mockReturnValue(false);
    let onOfflineCallback: (() => void) | null = null;
    
    setupNetworkListeners.mockImplementation((onOnline: () => void, onOffline: () => void) => {
      onOfflineCallback = onOffline;
      return () => {};
    });

    render(<OfflineIndicator />);
    
    if (onOfflineCallback) {
      onOfflineCallback();
    }
    
    await waitFor(() => {
      const container = screen.getByText('No internet connection').closest('div');
      expect(container).toHaveClass('transition-all');
      expect(container).toHaveClass('duration-300');
    });
  });
});
