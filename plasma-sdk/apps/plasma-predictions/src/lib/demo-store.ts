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
  status: "active" | "won" | "lost" | "cashed_out";
  placedAt: string;
  resolvedAt?: string;
  cashOutPrice?: number;
  cashOutValue?: number;
}

export interface DemoStats {
  totalBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalProfit: number;
  winRate: number;
}

export interface DemoPortfolioStats {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  activeBets: number;
  resolvedBets: number;
}

interface DemoStore {
  isDemoMode: boolean;
  demoBalance: number;
  demoBets: DemoBet[];
  
  // Computed
  getDemoStats: () => DemoStats;
  getActiveDemoBets: () => DemoBet[];
  getPortfolioStats: (currentMarkets: PredictionMarket[]) => DemoPortfolioStats;
  
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
  cashOutDemoBet: (betId: string, currentPrice: number) => boolean;
  checkAndResolveExpiredBets: () => void;
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
            resolvedAt: new Date().toISOString(),
          };

          // If won, add winnings to balance (shares pay $1 each on win)
          const balanceChange = won ? bet.shares : 0;

          return {
            demoBets: updatedBets,
            demoBalance: state.demoBalance + balanceChange,
          };
        });
      },

      cashOutDemoBet: (betId, currentPrice) => {
        const state = get();
        const betIndex = state.demoBets.findIndex((b) => b.id === betId);
        if (betIndex === -1) return false;

        const bet = state.demoBets[betIndex];
        if (bet.status !== "active") return false;

        const cashOutValue = bet.shares * currentPrice;

        set((state) => {
          const updatedBets = [...state.demoBets];
          updatedBets[betIndex] = {
            ...bet,
            status: "cashed_out",
            resolvedAt: new Date().toISOString(),
            cashOutPrice: currentPrice,
            cashOutValue,
          };

          return {
            demoBets: updatedBets,
            demoBalance: state.demoBalance + cashOutValue,
          };
        });

        return true;
      },

      checkAndResolveExpiredBets: () => {
        set((state) => {
          const now = new Date();
          let balanceChange = 0;

          const updatedBets = state.demoBets.map((bet) => {
            // Skip already resolved bets
            if (bet.status !== "active") return bet;

            // Check if market has ended and resolved
            const market = bet.market;
            if (!market.resolved || !market.outcome) return bet;

            const endDate = new Date(market.endDate);
            if (endDate > now) return bet;

            // Market is resolved, determine if bet won
            const won = bet.outcome === market.outcome;
            
            if (won) {
              balanceChange += bet.shares; // Each share pays $1 on win
            }

            return {
              ...bet,
              status: won ? "won" as const : "lost" as const,
              resolvedAt: new Date().toISOString(),
            };
          });

          return {
            demoBets: updatedBets,
            demoBalance: state.demoBalance + balanceChange,
          };
        });
      },

      getPortfolioStats: (currentMarkets) => {
        const bets = get().demoBets;
        const active = bets.filter((b) => b.status === "active");
        const resolved = bets.filter((b) => 
          ["won", "lost", "cashed_out"].includes(b.status)
        );

        // Calculate total value based on current market prices
        let totalValue = 0;
        let totalCost = 0;

        for (const bet of active) {
          // Find the current market data
          const currentMarket = currentMarkets.find((m) => m.id === bet.marketId);
          const currentPrice = currentMarket
            ? bet.outcome === "YES" ? currentMarket.yesPrice : currentMarket.noPrice
            : bet.price; // Fall back to purchase price if market not found
          
          totalValue += bet.shares * currentPrice;
          totalCost += bet.amount;
        }

        const totalPnl = totalValue - totalCost;
        const totalPnlPercent = totalCost > 0 ? totalPnl / totalCost : 0;

        return {
          totalValue,
          totalPnl,
          totalPnlPercent,
          activeBets: active.length,
          resolvedBets: resolved.length,
        };
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
