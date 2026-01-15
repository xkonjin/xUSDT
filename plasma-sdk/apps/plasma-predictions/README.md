# Plasma Predictions

**Zero-gas prediction markets with instant settlement**

Plasma Predictions is a prediction market platform that enables users to bet on real-world events - politics, crypto, sports, tech, and more. Powered by Plasma Chain for gasless transactions and 2-second settlement times.

## Features

### Core Betting
- **Browse Markets** - Live prediction markets from Polymarket
- **Place Bets** - Bet YES or NO on any market outcome
- **Cash Out Early** - Exit positions before market resolution
- **Portfolio Tracking** - View your active bets and P&L

### Demo Mode
- **Paper Trading** - $10K demo balance to practice
- **Risk-Free** - Test strategies without real money
- **Full Features** - All functionality works in demo mode

### Social & Gamification
- **Leaderboard** - Compete with other predictors
- **Referral Program** - Earn 1% of referrals' trading fees
- **Streak Tracking** - Build winning streaks

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (persisted stores) |
| Data Fetching | TanStack React Query |
| Auth | Privy (embedded wallets) |
| Animations | Framer Motion |

## Quick Start

```bash
# From monorepo root
cd plasma-sdk/apps/plasma-predictions

# Copy environment variables
cp .env.local.example .env.local

# Start development server
npm run dev
```

App runs at http://localhost:3005

### Demo Mode (No Backend Required)

1. Click "Try Demo - $10K Free" on homepage
2. Browse markets and place paper trades
3. Track your demo portfolio

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy application ID |
| `NEXT_PUBLIC_PLASMA_RPC` | Yes | Plasma Chain RPC URL |
| `NEXT_PUBLIC_BACKEND_URL` | No | FastAPI backend for real bets |

## Project Structure

```
plasma-predictions/
├── src/
│   ├── app/
│   │   ├── api/              # API route proxies
│   │   ├── predictions/      # Markets listing page
│   │   ├── my-bets/          # Portfolio page
│   │   ├── leaderboard/      # Rankings page
│   │   └── referral/         # Referral program
│   ├── components/
│   │   ├── MarketCard.tsx    # Market display
│   │   ├── BettingModal.tsx  # Place bet modal
│   │   └── BetCard.tsx       # User bet display
│   ├── hooks/
│   │   ├── useMarkets.ts     # Market data fetching
│   │   └── useBets.ts        # User bets & betting
│   └── lib/
│       ├── demo-store.ts     # Demo mode state
│       └── types.ts          # TypeScript types
└── package.json
```

## Testing

```bash
npm run test      # Unit tests
npm run typecheck # Type checking
npm run lint      # Linting
```

---

**Built with ❤️ by [Plasma Network](https://plasma.to)**
