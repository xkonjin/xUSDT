# Plasma Predictions Agent Guide

This document provides context for AI agents working on the Plasma Predictions codebase.

## Project Overview

Plasma Predictions is a prediction market platform where users bet on real-world events. Think "Polymarket but faster" - zero gas fees, 2-second settlement on Plasma Chain.

### Core Value Proposition
- **Zero Fees** - Relayer sponsors all gas costs
- **Instant Settlement** - 2-second finality
- **Real Markets** - Live data from Polymarket
- **Demo Mode** - Paper trading with $10K balance

## State Management

**Three Zustand Stores:**

1. **demo-store.ts** - Demo mode state
   - `isDemoMode`, `demoBalance`, `demoBets`
   - `placeDemoBet()`, `cashOutDemoBet()`

2. **store.ts** - Betting modal state
   - `selectedMarket`, `openBettingModal()`

3. **leaderboard-store.ts** - Rankings
   - `leaders`, `period`, `sortBy`

## Code Patterns

### Demo Mode Pattern
```typescript
const { isDemoMode, placeDemoBet } = useDemoStore();

const handleBet = async () => {
  if (isDemoMode) {
    placeDemoBet({ market, outcome, amount });
  } else {
    await signTransfer({ to, amount });
  }
};
```

### Hook Pattern (React Query)
```typescript
export function useMarkets(filters: MarketFilters) {
  return useInfiniteQuery({
    queryKey: ["markets", filters],
    queryFn: ({ pageParam = 0 }) => fetchMarkets(filters, pageParam),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
  });
}
```

## Common Tasks

### Adding a New Market Category
1. Add to `MARKET_CATEGORIES` in `lib/constants.ts`
2. Add type to `MarketCategory` in `lib/types.ts`
3. Update `parsePolymarketData()` in `useMarkets.ts`

### Modifying Betting Flow
1. Update `BettingModal.tsx` for UI
2. Update `useBets.ts` for logic
3. Update `demo-store.ts` for demo mode

## Debugging

- Demo state in localStorage: `plasma-predictions-demo`
- Markets from `/api/markets` proxy
- Check Network tab for API responses

## Key Files

| File | Purpose |
|------|---------|
| `src/app/predictions/page.tsx` | Markets listing |
| `src/components/BettingModal.tsx` | Bet placement |
| `src/hooks/useBets.ts` | Bet operations |
| `src/lib/demo-store.ts` | Demo mode state |

---

## Session Learnings Template

```markdown
### Session: [DATE]
**Focus**: [What was worked on]
**Fixed**: 
- Issue → Solution
**Learnings**:
- Key insight
```

---

*Last updated: January 2026*
