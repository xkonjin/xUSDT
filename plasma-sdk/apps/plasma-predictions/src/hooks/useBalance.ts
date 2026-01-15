"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pledictions_balance";
const INITIAL_BALANCE = 1000;

export interface UseBalanceReturn {
  balance: number;
  deductBalance: (amount: number) => boolean;
  addBalance: (amount: number) => void;
  resetBalance: () => void;
  isLoading: boolean;
}

export function useBalance(): UseBalanceReturn {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [isLoading, setIsLoading] = useState(true);

  // Load balance from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= 0) {
          setBalance(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load balance from localStorage:", error);
    }
    setIsLoading(false);
  }, []);

  // Save balance to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, balance.toString());
      } catch (error) {
        console.error("Failed to save balance to localStorage:", error);
      }
    }
  }, [balance, isLoading]);

  const deductBalance = useCallback((amount: number): boolean => {
    if (amount <= 0) return false;
    if (amount > balance) return false;
    
    setBalance((prev) => {
      const newBalance = prev - amount;
      return Math.max(0, Number(newBalance.toFixed(2)));
    });
    return true;
  }, [balance]);

  const addBalance = useCallback((amount: number): void => {
    if (amount <= 0) return;
    setBalance((prev) => Number((prev + amount).toFixed(2)));
  }, []);

  const resetBalance = useCallback((): void => {
    setBalance(INITIAL_BALANCE);
  }, []);

  return {
    balance,
    deductBalance,
    addBalance,
    resetBalance,
    isLoading,
  };
}

// Format balance for display
export function formatBalance(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format large numbers as compact (e.g., $1.5M)
export function formatCompactBalance(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatBalance(amount);
}
