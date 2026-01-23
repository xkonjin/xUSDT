"use client";

import { useState, useEffect } from 'react';

/**
 * Hook to fetch and cache balance with auto-refresh
 * TODO: Replace with SWR when added to dependencies
 */
export function useBalance(address?: string) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Replace with actual balance fetch
        const response = await fetch(`/api/balance?address=${address}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch balance');
        }

        const data = await response.json();
        
        if (!cancelled) {
          setBalance(BigInt(data.balance));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchBalance();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchBalance, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address]);

  const refresh = () => {
    if (address) {
      setIsLoading(true);
      // Trigger re-fetch by updating a dependency
    }
  };

  return {
    balance,
    isLoading,
    error,
    refresh,
  };
}
