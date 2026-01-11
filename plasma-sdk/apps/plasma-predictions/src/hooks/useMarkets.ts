import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { PredictionMarket, MarketFilters } from "@/lib/types";
import { BACKEND_URL } from "@/lib/constants";

const MOCK_MARKETS: PredictionMarket[] = [
  {
    id: "btc-100k-2025",
    polymarketId: "0x1234",
    conditionId: "0xabc",
    question: "Will BTC reach $100,000 by end of 2025?",
    description:
      "This market will resolve to YES if Bitcoin reaches $100,000 USD on any major exchange before December 31, 2025.",
    category: "crypto",
    endDate: "2025-12-31T23:59:59Z",
    resolved: false,
    yesPrice: 0.65,
    noPrice: 0.35,
    volume24h: 125000,
    totalVolume: 5200000,
    liquidity: 1000000,
    imageUrl: "https://polymarket.com/images/btc.png",
    createdAt: "2024-01-15T00:00:00Z",
  },
  {
    id: "trump-2024",
    polymarketId: "0x5678",
    conditionId: "0xdef",
    question: "Will Donald Trump win the 2024 US Presidential Election?",
    description: "Resolves YES if Trump wins the electoral college vote.",
    category: "politics",
    endDate: "2024-11-05T23:59:59Z",
    resolved: false,
    yesPrice: 0.52,
    noPrice: 0.48,
    volume24h: 850000,
    totalVolume: 12000000,
    liquidity: 3500000,
    createdAt: "2023-06-01T00:00:00Z",
  },
  {
    id: "eth-10k-2025",
    polymarketId: "0x9abc",
    conditionId: "0x123",
    question: "Will ETH reach $10,000 in 2025?",
    description: "Market resolves YES if Ethereum trades above $10,000 USD.",
    category: "crypto",
    endDate: "2025-12-31T23:59:59Z",
    resolved: false,
    yesPrice: 0.28,
    noPrice: 0.72,
    volume24h: 45000,
    totalVolume: 980000,
    liquidity: 250000,
    createdAt: "2024-03-01T00:00:00Z",
  },
  {
    id: "fed-rate-cut",
    polymarketId: "0xdef1",
    conditionId: "0x456",
    question: "Will the Fed cut rates by 50bps in March 2025?",
    description: "Resolves YES if FOMC announces 50+ basis point cut.",
    category: "finance",
    endDate: "2025-03-20T18:00:00Z",
    resolved: false,
    yesPrice: 0.15,
    noPrice: 0.85,
    volume24h: 32000,
    totalVolume: 420000,
    liquidity: 150000,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ai-agi-2025",
    polymarketId: "0xaaa1",
    conditionId: "0x789",
    question: "Will OpenAI announce AGI in 2025?",
    description:
      "Resolves YES if OpenAI officially claims to have achieved AGI.",
    category: "tech",
    endDate: "2025-12-31T23:59:59Z",
    resolved: false,
    yesPrice: 0.08,
    noPrice: 0.92,
    volume24h: 18000,
    totalVolume: 350000,
    liquidity: 80000,
    createdAt: "2024-11-01T00:00:00Z",
  },
  {
    id: "super-bowl-chiefs",
    polymarketId: "0xbbb1",
    conditionId: "0xaaa",
    question: "Will the Kansas City Chiefs win Super Bowl LIX?",
    description: "Resolves YES if Chiefs win Super Bowl 59.",
    category: "sports",
    endDate: "2025-02-09T23:59:59Z",
    resolved: false,
    yesPrice: 0.22,
    noPrice: 0.78,
    volume24h: 75000,
    totalVolume: 1500000,
    liquidity: 400000,
    createdAt: "2024-09-01T00:00:00Z",
  },
];

async function fetchMarkets(
  filters: MarketFilters,
  page = 0
): Promise<{ markets: PredictionMarket[]; hasMore: boolean }> {
  // In production, fetch from backend
  // const res = await fetch(`${BACKEND_URL}/api/predictions/markets?${new URLSearchParams(...)}`);

  // For MVP, use mock data with filtering
  let filtered = [...MOCK_MARKETS];

  if (filters.category && filters.category !== "all") {
    filtered = filtered.filter((m) => m.category === filters.category);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.question.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search)
    );
  }

  if (filters.resolved !== undefined) {
    filtered = filtered.filter((m) => m.resolved === filters.resolved);
  }

  // Sort
  switch (filters.sortBy) {
    case "volume":
      filtered.sort((a, b) => b.totalVolume - a.totalVolume);
      break;
    case "endDate":
      filtered.sort(
        (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
      );
      break;
    case "liquidity":
      filtered.sort((a, b) => b.liquidity - a.liquidity);
      break;
    case "newest":
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    default:
      filtered.sort((a, b) => b.volume24h - a.volume24h);
  }

  // Paginate
  const pageSize = 10;
  const start = page * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return {
    markets: paged,
    hasMore: start + pageSize < filtered.length,
  };
}

async function fetchMarket(id: string): Promise<PredictionMarket | null> {
  // In production: fetch from backend
  // const res = await fetch(`${BACKEND_URL}/api/predictions/markets/${id}`);

  const market = MOCK_MARKETS.find((m) => m.id === id);
  return market || null;
}

export function useMarkets(filters: MarketFilters) {
  return useInfiniteQuery({
    queryKey: ["markets", filters],
    queryFn: ({ pageParam = 0 }) => fetchMarkets(filters, pageParam),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length : undefined,
    initialPageParam: 0,
  });
}

export function useMarket(id: string) {
  return useQuery({
    queryKey: ["market", id],
    queryFn: () => fetchMarket(id),
    enabled: !!id,
  });
}

export function useTrendingMarkets() {
  return useQuery({
    queryKey: ["trending-markets"],
    queryFn: async () => {
      // Fetch top markets by 24h volume
      const { markets } = await fetchMarkets({ sortBy: "volume" });
      return markets.slice(0, 5);
    },
  });
}
