import { create } from "zustand";
import type { MarketCategory, Bet, PredictionMarket } from "./types";

interface PredictionStore {
  selectedCategory: MarketCategory;
  setCategory: (category: MarketCategory) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  slippage: number;
  setSlippage: (slippage: number) => void;

  bettingModal: {
    isOpen: boolean;
    market: PredictionMarket | null;
    outcome: "YES" | "NO" | null;
  };
  openBettingModal: (market: PredictionMarket, outcome: "YES" | "NO") => void;
  closeBettingModal: () => void;

  cashOutModal: {
    isOpen: boolean;
    bet: Bet | null;
  };
  openCashOutModal: (bet: Bet) => void;
  closeCashOutModal: () => void;

  recentTx: {
    hash: string;
    type: "bet" | "cashout" | "deposit";
    status: "pending" | "success" | "failed";
  } | null;
  setRecentTx: (
    tx: {
      hash: string;
      type: "bet" | "cashout" | "deposit";
      status: "pending" | "success" | "failed";
    } | null
  ) => void;
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  selectedCategory: "all",
  setCategory: (category) => set({ selectedCategory: category }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  slippage: 1,
  setSlippage: (slippage) => set({ slippage }),

  bettingModal: {
    isOpen: false,
    market: null,
    outcome: null,
  },
  openBettingModal: (market, outcome) =>
    set({
      bettingModal: { isOpen: true, market, outcome },
    }),
  closeBettingModal: () =>
    set({
      bettingModal: { isOpen: false, market: null, outcome: null },
    }),

  cashOutModal: {
    isOpen: false,
    bet: null,
  },
  openCashOutModal: (bet) =>
    set({
      cashOutModal: { isOpen: true, bet },
    }),
  closeCashOutModal: () =>
    set({
      cashOutModal: { isOpen: false, bet: null },
    }),

  recentTx: null,
  setRecentTx: (tx) => set({ recentTx: tx }),
}));
