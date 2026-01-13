# Plasma Stream

**Real-time salary and subscription payment streaming on Plasma Chain**

Plasma Stream enables time-based payment streaming with zero gas fees. Create streams for salaries, subscriptions, or vesting schedules - recipients can withdraw vested funds at any time.

## Features

### Stream Management
- **Create Streams** - Set up payment streams with custom duration and cliff periods
- **Real-time Vesting** - Funds vest continuously over the stream duration
- **Instant Withdrawals** - Recipients withdraw available funds anytime
- **Cancelable Streams** - Senders can cancel and reclaim unvested funds

### Stream Types
- **Salary Payments** - Pay employees by the second
- **Subscription Billing** - Continuous service payments
- **Vesting Schedules** - Token vesting with cliff periods

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Privy |
| Database | Prisma |
| Validation | Zod |

## Quick Start

```bash
cd plasma-sdk/apps/plasma-stream
cp .env.example .env.local
npm run dev
```

App runs at http://localhost:3003

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy application ID |
| `DATABASE_URL` | Yes | Prisma database connection |
| `RELAYER_PRIVATE_KEY` | Yes | Gas sponsorship |

## Stream Lifecycle

```
CREATE → CLIFF PERIOD → VESTING → WITHDRAW* → COMPLETED
                           ↓
                        CANCEL (sender)
```

## Project Structure

```
plasma-stream/
├── src/
│   ├── app/
│   │   ├── api/streams/      # Stream API routes
│   │   ├── create/           # Create stream page
│   │   └── page.tsx          # Dashboard
│   ├── components/
│   │   └── StreamCard.tsx    # Stream display
│   └── lib/
│       ├── contracts/        # Service abstraction
│       └── validation.ts     # Zod schemas
└── package.json
```

---

**Built with ❤️ by [Plasma Network](https://plasma.to)**
