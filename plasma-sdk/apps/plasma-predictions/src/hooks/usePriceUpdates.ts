"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePriceUpdaterContext } from '@/lib/price-updater-context';
import type { PriceUpdate, ConnectionStatus, PriceChange } from '@/lib/price-updater';

export interface UsePriceUpdatesOptions {
  /**
   * Callback when price update is received
   */
  onUpdate?: (update: PriceUpdate) => void;
  /**
   * Duration to show "live" indicator after update (ms)
   * @default 2500
   */
  liveTimeout?: number;
}

export interface UsePriceUpdatesResult {
  /**
   * Latest price update data
   */
  priceUpdate: PriceUpdate | null;
  /**
   * Whether we received a recent price update
   */
  isLive: boolean;
  /**
   * Direction of last price change
   */
  priceChange: PriceChange;
}

/**
 * Hook to subscribe to real-time price updates for a specific market
 */
export function usePriceUpdates(
  marketId: string | undefined,
  options: UsePriceUpdatesOptions = {}
): UsePriceUpdatesResult {
  const { onUpdate, liveTimeout = 2500 } = options;
  const priceUpdater = usePriceUpdaterContext();
  
  const [priceUpdate, setPriceUpdate] = useState<PriceUpdate | null>(null);
  const [isLive, setIsLive] = useState(false);
  const liveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store onUpdate in ref to avoid re-subscriptions on callback change
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!marketId) return;

    const handleUpdate = (update: PriceUpdate) => {
      setPriceUpdate(update);
      setIsLive(true);
      
      // Call optional callback
      onUpdateRef.current?.(update);
      
      // Clear existing timeout
      if (liveTimeoutRef.current) {
        clearTimeout(liveTimeoutRef.current);
      }
      
      // Set timeout to clear live indicator
      liveTimeoutRef.current = setTimeout(() => {
        setIsLive(false);
      }, liveTimeout);
    };

    const unsubscribe = priceUpdater.subscribe(marketId, handleUpdate);

    return () => {
      unsubscribe();
      if (liveTimeoutRef.current) {
        clearTimeout(liveTimeoutRef.current);
      }
    };
  }, [marketId, priceUpdater, liveTimeout]);

  return {
    priceUpdate,
    isLive,
    priceChange: priceUpdate?.priceChange ?? 'none',
  };
}

export interface UsePriceConnectionResult {
  /**
   * Current connection status
   */
  status: ConnectionStatus;
  /**
   * Whether connected and receiving updates
   */
  isConnected: boolean;
  /**
   * Whether currently trying to connect
   */
  isConnecting: boolean;
  /**
   * Whether there was a connection error
   */
  hasError: boolean;
}

/**
 * Hook to monitor price updater connection status
 */
export function usePriceConnection(): UsePriceConnectionResult {
  const priceUpdater = usePriceUpdaterContext();
  const [status, setStatus] = useState<ConnectionStatus>(
    priceUpdater.getConnectionStatus()
  );

  useEffect(() => {
    const removeListener = priceUpdater.onConnectionChange(setStatus);
    // Get initial status
    setStatus(priceUpdater.getConnectionStatus());
    return removeListener;
  }, [priceUpdater]);

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    hasError: status === 'error',
  };
}
