import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlasmaWallet, useGaslessTransfer } from "@plasma-pay/privy-auth";
import type { Bet, PlaceBetParams, CashOutParams, BetResult, UserBet, PredictionMarket } from "@/lib/types";
import { GASLESS_ROUTER_ADDRESS } from "@/lib/constants";
import { usePredictionStore } from "@/lib/store";
import { useDemoStore, type DemoBet, type DemoPortfolioStats } from "@/lib/demo-store";
import type { Address } from "viem";

const MOCK_BETS: UserBet[] = [];

async function fetchUserBets(address: string): Promise<UserBet[]> {
  // In production: fetch from backend
  // const res = await fetch(`${BACKEND_URL}/api/predictions/bets?user=${address}`);

  return MOCK_BETS.filter(
    (b) => b.userAddress.toLowerCase() === address.toLowerCase()
  );
}

async function submitBet(params: PlaceBetParams & { signature: any; authorization: any }): Promise<BetResult> {
  // In production: submit to relay
  // const res = await fetch(`${BACKEND_URL}/api/predictions/bet`, {
  //   method: 'POST',
  //   body: JSON.stringify(params),
  // });

  // Mock success
  await new Promise((r) => setTimeout(r, 2000));
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).slice(2)}`,
    shares: Number(params.amount) / 1e6 / 0.65, // Approximate shares based on price
  };
}

async function submitCashOut(params: CashOutParams & { signature: any }): Promise<BetResult> {
  // In production: submit to relay
  await new Promise((r) => setTimeout(r, 2000));
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).slice(2)}`,
  };
}

export function useUserBets(address?: string) {
  const { wallet, authenticated } = usePlasmaWallet();
  const userAddress = address || wallet?.address;

  return useQuery({
    queryKey: ["user-bets", userAddress],
    queryFn: () => fetchUserBets(userAddress!),
    enabled: authenticated && !!userAddress,
  });
}

export function usePortfolioStats() {
  const { data: bets } = useUserBets();

  if (!bets || bets.length === 0) {
    return {
      totalValue: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      activeBets: 0,
      resolvedBets: 0,
    };
  }

  const active = bets.filter((b) => b.status === "active");
  const resolved = bets.filter((b) => ["won", "lost", "cashed_out"].includes(b.status));

  // Calculate value based on shares and current market prices
  const totalValue = active.reduce((sum, b) => {
    const price = b.outcome === "YES" ? (b.market?.yesPrice || 0.5) : (b.market?.noPrice || 0.5);
    return sum + (b.shares * price);
  }, 0);
  const totalCost = active.reduce((sum, b) => sum + b.amount, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPercent = totalCost > 0 ? totalPnl / totalCost : 0;

  return {
    totalValue,
    totalPnl,
    totalPnlPercent,
    activeBets: active.length,
    resolvedBets: resolved.length,
  };
}

export function usePlaceBet() {
  const queryClient = useQueryClient();
  const { wallet } = usePlasmaWallet();
  const address = wallet?.address;
  const { signTransfer } = useGaslessTransfer();
  const { setRecentTx, closeBettingModal } = usePredictionStore();

  return useMutation({
    mutationFn: async (params: PlaceBetParams) => {
      // 1. Build and sign EIP-3009 authorization
      const result = await signTransfer({
        to: (GASLESS_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
        amount: params.amount,
        validityPeriod: 600,
      });

      if (!result.success || !result.signature || !result.typedData) {
        throw new Error(result.error || "Failed to sign transfer");
      }

      // 2. Submit to relay
      const betResult = await submitBet({
        ...params,
        authorization: result.typedData,
        signature: result.signature,
      });

      return betResult;
    },
    onMutate: () => {
      setRecentTx({
        hash: "",
        type: "bet",
        status: "pending",
      });
    },
    onSuccess: (result) => {
      if (result.success && result.txHash) {
        setRecentTx({
          hash: result.txHash,
          type: "bet",
          status: "success",
        });
        closeBettingModal();
        // Refresh bets
        queryClient.invalidateQueries({ queryKey: ["user-bets", address] });
      } else {
        setRecentTx({
          hash: "",
          type: "bet",
          status: "failed",
        });
      }
    },
    onError: () => {
      setRecentTx({
        hash: "",
        type: "bet",
        status: "failed",
      });
    },
  });
}

export function useCashOut() {
  const queryClient = useQueryClient();
  const { wallet } = usePlasmaWallet();
  const address = wallet?.address;
  const { signTransfer } = useGaslessTransfer();
  const { setRecentTx, closeCashOutModal } = usePredictionStore();

  return useMutation({
    mutationFn: async (params: CashOutParams) => {
      // For cash out, we need to sign approval for the AMM to take our shares
      // This is simplified - actual implementation would need different typed data
      const mockSignature = "0x" as const;

      const result = await submitCashOut({
        ...params,
        signature: { v: 27, r: mockSignature, s: mockSignature },
      });

      return result;
    },
    onMutate: () => {
      setRecentTx({
        hash: "",
        type: "cashout",
        status: "pending",
      });
    },
    onSuccess: (result) => {
      if (result.success && result.txHash) {
        setRecentTx({
          hash: result.txHash,
          type: "cashout",
          status: "success",
        });
        closeCashOutModal();
        queryClient.invalidateQueries({ queryKey: ["user-bets", address] });
      } else {
        setRecentTx({
          hash: "",
          type: "cashout",
          status: "failed",
        });
      }
    },
    onError: () => {
      setRecentTx({
        hash: "",
        type: "cashout",
        status: "failed",
      });
    },
  });
}

// =====================
// DEMO MODE HOOKS
// =====================

/**
 * Convert a DemoBet to UserBet format for consistency
 */
function demoBetToUserBet(demoBet: DemoBet): UserBet {
  return {
    id: demoBet.id,
    marketId: demoBet.marketId,
    market: demoBet.market,
    userAddress: "DEMO_USER",
    outcome: demoBet.outcome,
    shares: demoBet.shares,
    amount: demoBet.amount,
    status: demoBet.status === "cashed_out" ? "cashed_out" : demoBet.status,
    createdAt: demoBet.placedAt,
    settledAt: demoBet.resolvedAt,
    txHash: `demo-tx-${demoBet.id}`,
  };
}

/**
 * Hook to get user bets in demo mode
 * Returns demo bets converted to UserBet format
 */
export function useDemoUserBets() {
  const demoBets = useDemoStore((state) => state.demoBets);
  
  // Convert demo bets to UserBet format
  const data: UserBet[] = demoBets.map(demoBetToUserBet);
  
  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
  };
}

/**
 * Hook to get portfolio stats in demo mode
 */
export function useDemoPortfolioStats(currentMarkets: PredictionMarket[]): DemoPortfolioStats {
  const getPortfolioStats = useDemoStore((state) => state.getPortfolioStats);
  return getPortfolioStats(currentMarkets);
}

/**
 * Parameters for placing a demo bet
 */
export interface DemoPlaceBetParams {
  market: PredictionMarket;
  outcome: "YES" | "NO";
  amount: number;
}

/**
 * Hook to place a bet in demo mode
 */
export function useDemoPlaceBet() {
  const placeDemoBet = useDemoStore((state) => state.placeDemoBet);
  const { setRecentTx, closeBettingModal } = usePredictionStore();

  return useMutation({
    mutationFn: async (params: DemoPlaceBetParams) => {
      // Simulate a small delay for UX
      await new Promise((r) => setTimeout(r, 500));
      
      const bet = placeDemoBet({
        market: params.market,
        outcome: params.outcome,
        amount: params.amount,
      });
      
      if (!bet) {
        throw new Error("Failed to place bet. Check your balance.");
      }
      
      return {
        success: true,
        txHash: `demo-tx-${bet.id}`,
        shares: bet.shares,
        bet,
      };
    },
    onMutate: () => {
      setRecentTx({
        hash: "",
        type: "bet",
        status: "pending",
      });
    },
    onSuccess: (result) => {
      if (result.success && result.txHash) {
        setRecentTx({
          hash: result.txHash,
          type: "bet",
          status: "success",
        });
        closeBettingModal();
      } else {
        setRecentTx({
          hash: "",
          type: "bet",
          status: "failed",
        });
      }
    },
    onError: () => {
      setRecentTx({
        hash: "",
        type: "bet",
        status: "failed",
      });
    },
  });
}

/**
 * Parameters for cashing out a demo bet
 */
export interface DemoCashOutParams {
  betId: string;
  currentPrice: number;
}

/**
 * Hook to cash out a bet in demo mode
 */
export function useDemoCashOut() {
  const cashOutDemoBet = useDemoStore((state) => state.cashOutDemoBet);
  const { setRecentTx, closeCashOutModal } = usePredictionStore();

  return useMutation({
    mutationFn: async (params: DemoCashOutParams) => {
      // Simulate a small delay for UX
      await new Promise((r) => setTimeout(r, 500));
      
      const success = cashOutDemoBet(params.betId, params.currentPrice);
      
      if (!success) {
        throw new Error("Failed to cash out. Bet may already be resolved.");
      }
      
      return {
        success: true,
        txHash: `demo-cashout-${params.betId}`,
      };
    },
    onMutate: () => {
      setRecentTx({
        hash: "",
        type: "cashout",
        status: "pending",
      });
    },
    onSuccess: (result) => {
      if (result.success && result.txHash) {
        setRecentTx({
          hash: result.txHash,
          type: "cashout",
          status: "success",
        });
        closeCashOutModal();
      } else {
        setRecentTx({
          hash: "",
          type: "cashout",
          status: "failed",
        });
      }
    },
    onError: () => {
      setRecentTx({
        hash: "",
        type: "cashout",
        status: "failed",
      });
    },
  });
}
