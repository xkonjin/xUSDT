import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlasmaWallet, useGaslessTransfer } from "@plasma-pay/privy-auth";
import type { Bet, PlaceBetParams, CashOutParams, BetResult } from "@/lib/types";
import { GASLESS_ROUTER_ADDRESS } from "@/lib/constants";
import { usePredictionStore } from "@/lib/store";
import type { Address, Hex } from "viem";
import type { EIP3009TypedData } from "@plasma-pay/core";

/**
 * EIP-712 signature components
 */
interface EIP712Signature {
  v: number;
  r: Hex;
  s: Hex;
}

const MOCK_BETS: Bet[] = [];

async function fetchUserBets(address: string): Promise<Bet[]> {
  // In production: fetch from backend
  // const res = await fetch(`${BACKEND_URL}/api/predictions/bets?user=${address}`);

  return MOCK_BETS.filter(
    (b) => b.userAddress.toLowerCase() === address.toLowerCase()
  );
}

async function submitBet(params: PlaceBetParams & { signature: Hex; authorization: EIP3009TypedData }): Promise<BetResult> {
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

async function submitCashOut(params: CashOutParams & { signature: EIP712Signature }): Promise<BetResult> {
  // In production: submit to relay
  await new Promise((r) => setTimeout(r, 2000));
  
  return {
    success: true,
    txHash: `0x${Math.random().toString(16).slice(2)}`,
  };
}

export function useUserBets() {
  const { wallet, authenticated } = usePlasmaWallet();
  const address = wallet?.address;

  return useQuery({
    queryKey: ["user-bets", address],
    queryFn: () => fetchUserBets(address!),
    enabled: authenticated && !!address,
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

  const totalValue = active.reduce((sum, b) => sum + b.currentValue, 0);
  const totalCost = active.reduce((sum, b) => sum + b.costBasis, 0);
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
