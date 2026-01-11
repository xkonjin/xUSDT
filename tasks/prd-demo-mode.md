# PRD: Plasma Predictions - Demo Mode & UI Polish

## Executive Summary

This PRD outlines the implementation of a **Demo Mode** (paper trading) for Plasma Predictions, along with UI refinements to create a more polished, professional user experience. The goal is to allow users to experience the platform without financial risk while improving overall design quality.

## Problem Statement

1. **Barrier to Entry**: Users cannot try the platform without connecting a wallet and depositing real funds
2. **Wallet Connection Issues**: Privy integration requires valid app ID and proper configuration
3. **UI Quality**: Current design has an "AI-generated" feel that needs refinement
4. **User Trust**: New users need a way to build confidence before committing real money

## Goals

1. Enable paper trading with virtual $10,000 USDT demo balance
2. Clear visual distinction between Demo and Live modes
3. Polish UI to match premium fintech apps (Coinbase, Robinhood style)
4. Improve wallet connection reliability

## User Stories

### Demo Mode
1. As a new user, I want to try paper trading without connecting a wallet, so I can learn the platform risk-free
2. As a demo user, I want to see a clear "Demo Mode" indicator throughout the app, so I know I'm not using real money
3. As a demo user, I want to be able to reset my demo balance, so I can start fresh
4. As a demo user, I want to see my demo bets tracked separately, so I can monitor my paper trading performance
5. As a returning user, I want my demo data to persist across sessions, so I can continue where I left off

### UI Polish
6. As a user, I want a cleaner, less flashy UI, so the app feels professional and trustworthy
7. As a user, I want faster loading states, so the app feels responsive
8. As a user, I want intuitive navigation, so I can find what I need quickly

## Technical Architecture

### Demo Mode State Management

```typescript
// lib/demo-store.ts
interface DemoStore {
  isDemoMode: boolean;
  demoBalance: number; // in USDT (default 10000)
  demoBets: DemoBet[];
  demoStats: DemoStats;
  
  // Actions
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  placeDemoBet: (bet: DemoBetInput) => void;
  resetDemoAccount: () => void;
}

interface DemoBet {
  id: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  shares: number;
  price: number;
  status: 'active' | 'won' | 'lost';
  placedAt: string;
}

interface DemoStats {
  totalBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalProfit: number;
}
```

### localStorage Persistence

```typescript
const DEMO_STORAGE_KEY = 'plasma-predictions-demo';

// Auto-save demo state to localStorage
// Load on app init
```

### Demo Mode Toggle Flow

1. User clicks "Try Demo" on landing page OR in header
2. App enters demo mode (stored in zustand + localStorage)
3. Demo balance shown instead of real balance
4. Demo bets tracked separately
5. User can toggle back to real mode at any time

## Screens & Components

### 1. Demo Mode Banner (Global)

A persistent banner when in demo mode:
```
┌─────────────────────────────────────────────────┐
│ 🎮 DEMO MODE • $10,000 paper balance • Exit Demo │
└─────────────────────────────────────────────────┘
```

### 2. Updated Header

```
┌─────────────────────────────────────────────────┐
│ [Logo] Plasma        Markets | My Bets | Leaders │
│                                                  │
│                      Demo: $10,000 [Exit Demo]   │
│                      -- OR --                    │
│                      $125.50 [Dropdown v]        │
└─────────────────────────────────────────────────┘
```

### 3. Landing Page Update

Add "Try Demo" CTA:
```
┌─────────────────────────────────────────────────┐
│         Predict the Future. Win Big.            │
│                                                  │
│    [Browse Markets]  [Try Demo - $10K Free]     │
└─────────────────────────────────────────────────┘
```

### 4. Demo Settings Dropdown

When clicking demo balance:
```
┌──────────────────────────────────┐
│ Demo Account                     │
│ ────────────────────────────────│
│ Balance: $10,000.00              │
│ Bets: 5 active                   │
│ P&L: +$234.56 (+2.3%)            │
│ ────────────────────────────────│
│ [🔄 Reset Balance] [Exit Demo]   │
└──────────────────────────────────┘
```

### 5. Betting Modal (Demo variant)

```
┌──────────────────────────────────────────────┐
│ 🎮 DEMO BET                                  │
│ ─────────────────────────────────────────────│
│ Will Trump win 2024?                         │
│                                              │
│ Amount: [$____50____]  Balance: $10,000      │
│                                              │
│ [$5] [$10] [$25] [$50] [$100]               │
│                                              │
│ You receive: 76.9 YES shares                 │
│ If YES wins: +$26.90 (+53%)                  │
│                                              │
│ [Place Demo Bet →]                           │
│                                              │
│ ⚡ Demo mode • No real money involved        │
└──────────────────────────────────────────────┘
```

## UI Polish Changes

### Color Palette Simplification

**Before (Too flashy):**
- Multiple gradient glows
- Heavy blur effects
- Holographic/chrome effects

**After (Clean & Professional):**
- Single accent color (cyan)
- Subtle shadows
- Clean white/gray text hierarchy
- Minimal blur

### CSS Changes

```css
/* Simpler card style */
.market-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  /* Remove heavy blur, glow, and gradient effects */
}

/* Cleaner buttons */
.btn-yes {
  background: #00ffaa;
  color: #000;
  /* Remove glow shadows */
}

.btn-no {
  background: #ff5080;
  color: #fff;
}

/* Simpler text */
.text-primary { color: #ffffff; }
.text-secondary { color: #a0a0a0; }
.text-muted { color: #606060; }
```

### Typography

- Use system fonts for better performance
- Clearer hierarchy: 
  - Headlines: Bold, white
  - Body: Regular, gray
  - Captions: Small, muted

## Implementation Plan

### Phase 1: Demo Mode Core (Issues #1-4)
1. Create demo store with zustand
2. Add localStorage persistence  
3. Implement demo balance display
4. Add demo bet placement logic

### Phase 2: Demo UI Components (Issues #5-8)
5. Add demo mode banner
6. Update Header with demo toggle
7. Update BettingModal for demo
8. Add demo settings dropdown

### Phase 3: UI Polish (Issues #9-12)
9. Simplify color palette
10. Clean up card styles
11. Improve button consistency
12. Polish animations

### Phase 4: Integration (Issues #13-15)
13. Add "Try Demo" to landing page
14. Update My Bets for demo bets
15. E2E tests for demo mode

## Success Metrics

1. **Demo Adoption**: 50%+ of new visitors try demo mode
2. **Conversion**: 20%+ of demo users connect wallet
3. **Engagement**: Demo users place 5+ bets on average
4. **Retention**: 30%+ return within 7 days

## Out of Scope

- Real money functionality changes
- Backend API changes (demo is client-side only)
- Mobile app (web only)
- Social features

## Timeline

- Phase 1: 2 hours
- Phase 2: 2 hours  
- Phase 3: 2 hours
- Phase 4: 1 hour
- Testing: 1 hour

**Total: ~8 hours**

## Appendix

### Reference Apps
- Coinbase: Clean layout, clear balance display, simple navigation
- Robinhood: Gamified but clean, green/red for gains/losses
- Polymarket: 4.8 star iOS app, intuitive mobile design

### Demo Mode Best Practices (from research)
- Clear visual distinction from real trading
- Realistic market simulation
- Easy toggle between demo/live
- Persist demo data across sessions
- Option to reset balance
