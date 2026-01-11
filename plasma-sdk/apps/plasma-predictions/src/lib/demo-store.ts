import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PredictionMarket } from "./types";

const DEMO_STORAGE_KEY = "plasma-predictions-demo";
const INITIAL_DEMO_BALANCE = 10000;

export interface DemoBet {
  id: string;
  marketId: string;
  market: PredictionMarket;
  outcome: "YES" | "NO";
  amount: number;
  shares: number;
  price: number;
  status: "active" | "won" | "lost";
  placedAt: string;
}

export interface DemoStats {
  totalBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalProfit: number;
  winRate: number;
}

interface DemoStore {
  isDemoMode: boolean;
  demoBalance: number;
  demoBets: DemoBet[];
  
  // Computed
  getDemoStats: () => DemoStats;
  getActiveDemoBets: () => DemoBet[];
  
  // Actions
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  toggleDemoMode: () => void;
  placeDemoBet: (params: {
    market: PredictionMarket;
    outcome: "YES" | "NO";
    amount: number;
  }) => DemoBet | null;
  resolveDemoBet: (betId: string, won: boolean) => void;
  resetDemoAccount: () => void;
}

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      isDemoMode: false,
      demoBalance: INITIAL_DEMO_BALANCE,
      demoBets: [],

      getDemoStats: () => {
        const bets = get().demoBets;
        const wins = bets.filter((b) => b.status === "won").length;
        const losses = bets.filter((b) => b.status === "lost").length;
        const totalWagered = bets.reduce((sum, b) => sum + b.amount, 0);
        
        // Calculate profit from resolved bets
        const resolvedBets = bets.filter((b) => b.status !== "active");
        const totalProfit = resolvedBets.reduce((sum, b) => {
          if (b.status === "won") {
            return sum + (b.shares - b.amount);
          }
          return sum - b.amount;
        }, 0);

        return {
          totalBets: bets.length,
          wins,
          losses,
          totalWagered,
          totalProfit,
          winRate: bets.length > 0 ? wins / (wins + losses) || 0 : 0,
        };
      },

      getActiveDemoBets: () => {
        return get().demoBets.filter((b) => b.status === "active");
      },

      enableDemoMode: () => set({ isDemoMode: true }),
      
      disableDemoMode: () => set({ isDemoMode: false }),
      
      toggleDemoMode: () => set((state) => ({ isDemoMode: !state.isDemoMode })),

      placeDemoBet: ({ market, outcome, amount }) => {
        const state = get();
        
        if (amount <= 0 || amount > state.demoBalance) {
          return null;
        }

        const price = outcome === "YES" ? market.yesPrice : market.noPrice;
        const shares = amount / price;

        const newBet: DemoBet = {
          id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          marketId: market.id,
          market,
          outcome,
          amount,
          shares,
          price,
          status: "active",
          placedAt: new Date().toISOString(),
        };

        set((state) => ({
          demoBalance: state.demoBalance - amount,
          demoBets: [newBet, ...state.demoBets],
        }));

        return newBet;
      },

      resolveDemoBet: (betId, won) => {
        set((state) => {
          const betIndex = state.demoBets.findIndex((b) => b.id === betId);
          if (betIndex === -1) return state;

          const bet = state.demoBets[betIndex];
          if (bet.status !== "active") return state;

          const updatedBets = [...state.demoBets];
          updatedBets[betIndex] = {
            ...bet,
            status: won ? "won" : "lost",
          };

          // If won, add winnings to balance
          const balanceChange = won ? bet.shares : 0;

          return {
            demoBets: updatedBets,
            demoBalance: state.demoBalance + balanceChange,
          };
        });
      },

      resetDemoAccount: () =>
        set({
          demoBalance: INITIAL_DEMO_BALANCE,
          demoBets: [],
        }),
    }),
    {
      name: DEMO_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isDemoMode: state.isDemoMode,
        demoBalance: state.demoBalance,
        demoBets: state.demoBets,
      }),
    }
  )
);

// Helper to format demo balance for display
export function formatDemoBalance(balance: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
}
