import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const PRICE_HISTORY_STORAGE_KEY = "plasma-predictions-price-history";

export type TimeRange = "1h" | "24h" | "7d" | "30d";

export interface PriceSnapshot {
  price: number;
  timestamp: number;
}

export interface PriceChange {
  absolute: number;
  percent: number;
  isPositive: boolean;
}

interface PriceHistoryState {
  history: Record<string, PriceSnapshot[]>;
}

interface PriceHistoryActions {
  addPriceSnapshot: (marketId: string, price: number) => void;
  addPriceSnapshotWithTimestamp: (marketId: string, price: number, timestamp: number) => void;
  getHistory: (marketId: string) => PriceSnapshot[];
  getHistoryForRange: (marketId: string, range: TimeRange) => PriceSnapshot[];
  getPriceChange: (marketId: string, range: TimeRange) => PriceChange;
  clearHistory: () => void;
  clearMarketHistory: (marketId: string) => void;
  generateDemoHistory: (marketId: string, currentPrice: number) => void;
}

type PriceHistoryStore = PriceHistoryState & PriceHistoryActions;

// Time range to milliseconds mapping
const TIME_RANGE_MS: Record<TimeRange, number> = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Maximum data points to keep per market (30 days worth at hourly intervals)
const MAX_DATA_POINTS = 720;

export const usePriceHistoryStore = create<PriceHistoryStore>()(
  persist(
    (set, get) => ({
      history: {},

      addPriceSnapshot: (marketId, price) => {
        const timestamp = Date.now();
        get().addPriceSnapshotWithTimestamp(marketId, price, timestamp);
      },

      addPriceSnapshotWithTimestamp: (marketId, price, timestamp) => {
        set((state) => {
          const existingHistory = state.history[marketId] || [];
          const newSnapshot: PriceSnapshot = { price, timestamp };
          
          // Add new snapshot and sort by timestamp
          let updatedHistory = [...existingHistory, newSnapshot].sort(
            (a, b) => a.timestamp - b.timestamp
          );

          // Trim to max data points
          if (updatedHistory.length > MAX_DATA_POINTS) {
            updatedHistory = updatedHistory.slice(-MAX_DATA_POINTS);
          }

          return {
            history: {
              ...state.history,
              [marketId]: updatedHistory,
            },
          };
        });
      },

      getHistory: (marketId) => {
        return get().history[marketId] || [];
      },

      getHistoryForRange: (marketId, range) => {
        const history = get().history[marketId] || [];
        const cutoff = Date.now() - TIME_RANGE_MS[range];
        return history.filter((snapshot) => snapshot.timestamp >= cutoff);
      },

      getPriceChange: (marketId, range) => {
        const history = get().getHistoryForRange(marketId, range);
        
        if (history.length < 2) {
          return { absolute: 0, percent: 0, isPositive: true };
        }

        const oldestPrice = history[0].price;
        const newestPrice = history[history.length - 1].price;
        const absolute = newestPrice - oldestPrice;
        const percent = oldestPrice > 0 ? (absolute / oldestPrice) * 100 : 0;

        return {
          absolute,
          percent,
          isPositive: absolute >= 0,
        };
      },

      clearHistory: () => {
        set({ history: {} });
      },

      clearMarketHistory: (marketId) => {
        set((state) => {
          const newHistory = { ...state.history };
          delete newHistory[marketId];
          return { history: newHistory };
        });
      },

      generateDemoHistory: (marketId, currentPrice) => {
        const now = Date.now();
        const history: PriceSnapshot[] = [];
        
        // Generate 30 days of hourly data (720 points)
        const points = 720;
        const intervalMs = TIME_RANGE_MS["30d"] / points;
        
        // Start with a random price offset from current
        let price = currentPrice + (Math.random() - 0.5) * 0.3;
        price = Math.max(0.05, Math.min(0.95, price)); // Clamp to valid range

        for (let i = 0; i < points; i++) {
          const timestamp = now - (points - i) * intervalMs;
          
          // Add some random walk with mean reversion toward current price
          const trend = (currentPrice - price) * 0.01; // Mean reversion
          const noise = (Math.random() - 0.5) * 0.02; // Random noise
          price = price + trend + noise;
          price = Math.max(0.01, Math.min(0.99, price)); // Clamp
          
          history.push({
            price,
            timestamp,
          });
        }

        // Ensure the last point matches current price
        if (history.length > 0) {
          history[history.length - 1].price = currentPrice;
        }

        set((state) => ({
          history: {
            ...state.history,
            [marketId]: history,
          },
        }));
      },
    }),
    {
      name: PRICE_HISTORY_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        history: state.history,
      }),
    }
  )
);

// Utility function to format price change for display
export function formatPriceChange(change: PriceChange): string {
  const sign = change.isPositive ? "+" : "";
  return `${sign}${change.percent.toFixed(1)}%`;
}
