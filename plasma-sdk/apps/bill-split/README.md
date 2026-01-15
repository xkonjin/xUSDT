# Splitzy (Bill Split)

**AI-powered bill splitting with zero gas fees on Plasma Chain**

Splitzy is a Splitwise-style application for splitting bills among friends. Scan receipts with AI, assign items to people, and settle up with instant gasless payments.

## Features

### Bill Creation
- **AI Receipt Scanning** - Upload receipt photos, AI extracts items
- **Manual Entry** - Add items and prices manually
- **Item Assignment** - Assign items to specific people or split equally
- **Tax & Tip** - Automatic proportional distribution

### Balance Tracking
- **Net Balance** - See what you owe vs what's owed to you
- **Debt Simplification** - Minimize payments across multiple bills
- **Per-Person View** - Track balances with each friend

### Payments
- **Gasless Transfers** - Zero fees via Plasma Chain
- **Payment Links** - Share links for easy payment

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Privy |
| State | Zustand |
| AI/OCR | OpenAI GPT-4o-mini Vision |

## Quick Start

```bash
cd plasma-sdk/apps/bill-split
cp .env.example .env.local
npm run dev
```

App runs at http://localhost:3004

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Prisma database |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy app ID |
| `OPENAI_API_KEY` | No | Receipt OCR |

## Bill Lifecycle

```
CREATE → SCAN RECEIPT → ADD PEOPLE → ASSIGN ITEMS → PAY → SETTLED
```

## Project Structure

```
bill-split/
├── src/
│   ├── app/
│   │   ├── api/bills/        # Bill CRUD
│   │   ├── bill/[id]/        # Bill detail
│   │   ├── new/              # Create bill
│   │   └── balances/         # Balance view
│   ├── components/
│   │   ├── BalanceDashboard.tsx
│   │   └── SimplifiedPaymentPlan.tsx
│   └── lib/
│       ├── balance-calculator.ts
│       ├── share-calculation.ts
│       └── simplify-debts.ts
└── package.json
```

---

**Built with ❤️ by [Plasma Network](https://plasma.to)**
