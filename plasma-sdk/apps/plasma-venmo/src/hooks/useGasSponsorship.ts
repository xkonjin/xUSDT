"use client";

import { useState, useEffect } from "react";

interface GasSponsorshipStats {
  txCount: number;
  txLimit: number;
  totalCostUsd: number;
  costLimit: number;
  remaining: number;
}

interface GasSponsorshipStatus {
  eligible: boolean;
  stats: GasSponsorshipStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check gas sponsorship eligibility for a wallet address
 */
export function useGasSponsorship(address: string | undefined): GasSponsorshipStatus {
  const [eligible, setEligible] = useState(true); // Default to eligible
  const [stats, setStats] = useState<GasSponsorshipStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSponsorship = async () => {
    if (!address) {
      setEligible(true);
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/gas-sponsorship?address=${address}`);
      if (!response.ok) {
        throw new Error("Failed to check sponsorship status");
      }
      const data = await response.json();
      setEligible(data.eligible);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Default to eligible on error (don't block users)
      setEligible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsorship();
  }, [address]);

  return {
    eligible,
    stats,
    loading,
    error,
    refetch: fetchSponsorship,
  };
}

/**
 * Log a sponsored transaction
 */
export async function logSponsoredTransaction(params: {
  userAddress: string;
  txHash: string;
  gasUsed?: string;
  gasCostUsd?: number;
  txType: string;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/gas-sponsorship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return response.ok;
  } catch {
    return false;
  }
}
