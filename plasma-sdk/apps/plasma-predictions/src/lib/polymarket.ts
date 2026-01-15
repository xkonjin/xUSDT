/**
 * Polymarket API Client
 * 
 * Provides typed access to the Polymarket Gamma API for fetching
 * prediction market data.
 */

const POLYMARKET_API = 'https://gamma-api.polymarket.com';

/**
 * Raw market data from Polymarket API
 */
export interface PolymarketMarket {
  id: string;
  slug: string;
  question: string;
  description: string;
  outcomes: string; // JSON string like '["Yes","No"]'
  outcomePrices: string; // JSON string like '[0.65,0.35]'
  volume: string;
  volumeNum: number;
  volume24hr: number;
  liquidity: string;
  liquidityNum: number;
  category: string;
  image: string;
  icon: string;
  endDate: string;
  startDate: string;
  createdAt: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  conditionId: string;
  questionId: string;
  events?: Array<{
    id: string;
    slug: string;
    title: string;
    icon: string;
    startDate: string;
    endDate: string;
  }>;
  tags?: Array<{
    id: string;
    slug: string;
    label: string;
  }>;
}

/**
 * Parsed outcome with name and price
 */
export interface ParsedOutcome {
  name: string;
  price: number;
}

/**
 * Fetch markets from Polymarket API
 * @param limit - Number of markets to fetch (default: 50)
 * @param offset - Offset for pagination (default: 0)
 * @param active - Filter by active status (default: true)
 * @param closed - Filter by closed status (default: false)
 */
export async function getMarkets(
  limit = 50,
  offset = 0,
  active = true,
  closed = false
): Promise<PolymarketMarket[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
    active: active.toString(),
    closed: closed.toString(),
    order: 'volume24hr',
    ascending: 'false',
  });

  const response = await fetch(`${POLYMARKET_API}/markets?${params}`, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as PolymarketMarket[];
}

/**
 * Fetch a single market by ID or slug
 * @param idOrSlug - Market ID or slug
 */
export async function getMarketById(idOrSlug: string): Promise<PolymarketMarket | null> {
  // First try to fetch by slug (more common use case)
  const params = new URLSearchParams({
    slug: idOrSlug,
    limit: '1',
  });

  let response = await fetch(`${POLYMARKET_API}/markets?${params}`, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as PolymarketMarket;
    }
  }

  // If not found by slug, try by condition ID (for legacy compatibility)
  const conditionParams = new URLSearchParams({
    condition_id: idOrSlug,
    limit: '1',
  });

  response = await fetch(`${POLYMARKET_API}/markets?${conditionParams}`, {
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (response.ok) {
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as PolymarketMarket;
    }
  }

  return null;
}

/**
 * Search markets by query
 * @param query - Search query
 * @param limit - Number of results to return
 */
export async function searchMarkets(
  query: string,
  limit = 20
): Promise<PolymarketMarket[]> {
  // Polymarket API doesn't have a search endpoint, so we fetch
  // more markets and filter locally
  const markets = await getMarkets(100, 0, true, false);
  
  const lowerQuery = query.toLowerCase();
  const filtered = markets.filter(m => 
    m.question.toLowerCase().includes(lowerQuery) ||
    m.description?.toLowerCase().includes(lowerQuery) ||
    m.category?.toLowerCase().includes(lowerQuery)
  );

  return filtered.slice(0, limit);
}

/**
 * Parse outcomes from JSON strings in market data
 * @param market - Polymarket market data
 * @returns Array of parsed outcomes with names and prices
 */
export function parseOutcomes(market: PolymarketMarket): ParsedOutcome[] {
  try {
    const outcomes: string[] = typeof market.outcomes === 'string'
      ? JSON.parse(market.outcomes)
      : market.outcomes || ['Yes', 'No'];

    const prices: number[] = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices)
      : market.outcomePrices || [0.5, 0.5];

    return outcomes.map((name, index) => ({
      name,
      price: prices[index] ?? 0.5,
    }));
  } catch {
    // Fallback to default binary market
    return [
      { name: 'Yes', price: 0.5 },
      { name: 'No', price: 0.5 },
    ];
  }
}

/**
 * Format volume to human readable string
 * @param volume - Volume in dollars
 * @returns Formatted string like "$1.2M" or "$500K"
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(0)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Get probability as percentage from price
 * @param price - Price between 0 and 1
 * @returns Percentage string like "65%"
 */
export function formatProbability(price: number): string {
  return `${Math.round(price * 100)}%`;
}

/**
 * Detect category from market data
 * @param market - Polymarket market
 * @returns Category slug
 */
export function detectCategory(market: PolymarketMarket): string {
  const question = market.question.toLowerCase();
  const category = market.category?.toLowerCase() || '';
  const tags = market.tags?.map(t => t.label.toLowerCase()) || [];
  
  // Check tags first
  for (const tag of tags) {
    if (tag.includes('politic') || tag.includes('election')) return 'politics';
    if (tag.includes('crypto') || tag.includes('bitcoin') || tag.includes('ethereum')) return 'crypto';
    if (tag.includes('sport') || tag.includes('nfl') || tag.includes('nba')) return 'sports';
    if (tag.includes('tech') || tag.includes('ai')) return 'tech';
    if (tag.includes('science')) return 'science';
    if (tag.includes('finance') || tag.includes('fed') || tag.includes('rate')) return 'finance';
    if (tag.includes('entertainment') || tag.includes('movie') || tag.includes('music')) return 'entertainment';
  }

  // Check category field
  if (category) {
    if (category.includes('politic')) return 'politics';
    if (category.includes('crypto')) return 'crypto';
    if (category.includes('sport')) return 'sports';
    if (category.includes('tech')) return 'tech';
  }

  // Keyword detection in question
  if (question.includes('trump') || question.includes('president') || 
      question.includes('election') || question.includes('congress') ||
      question.includes('senate') || question.includes('biden')) {
    return 'politics';
  }
  if (question.includes('bitcoin') || question.includes('btc') || 
      question.includes('ethereum') || question.includes('eth') ||
      question.includes('crypto') || question.includes('solana')) {
    return 'crypto';
  }
  if (question.includes('super bowl') || question.includes('nfl') || 
      question.includes('nba') || question.includes('world cup') ||
      question.includes('ufc') || question.includes('championship')) {
    return 'sports';
  }
  if (question.includes('ai') || question.includes('openai') || 
      question.includes('apple') || question.includes('google') ||
      question.includes('microsoft') || question.includes('tesla')) {
    return 'tech';
  }
  if (question.includes('fed') || question.includes('rate') || 
      question.includes('inflation') || question.includes('gdp') ||
      question.includes('stock') || question.includes('s&p')) {
    return 'finance';
  }
  if (question.includes('oscar') || question.includes('grammy') || 
      question.includes('movie') || question.includes('album')) {
    return 'entertainment';
  }

  return 'all';
}
