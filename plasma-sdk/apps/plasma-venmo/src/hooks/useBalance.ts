"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook to fetch and cache balance with auto-refresh
 */
export function useBalance(address?: string) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

        const response = await fetch(`/api/balance?address=${address}`);

        if (!response.ok) {
          throw new Error("Failed to fetch balance");
        }

        const data = await response.json();

        if (!cancelled) {
          setBalance(BigInt(data.balance));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchBalance();

    const interval = setInterval(fetchBalance, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    balance,
    isLoading,
    error,
    refresh,
  };
}
