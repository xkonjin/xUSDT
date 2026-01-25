# Plenmo

**Zero-fee P2P payments powered by Plasma Chain**

Plenmo is a Venmo-style payment application enabling instant, gasless USDT0 transfers on the Plasma network. Send money to anyone via email, phone, or wallet address—even if they don't have an account yet.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AY-Space/xUSDT/tree/main/plasma-sdk/apps/plasma-venmo)

## Features

| Feature | Description |
|---------|-------------|
| **Gasless Transfers** | Users never pay gas fees—relayer sponsors all transactions |
| **Send to Anyone** | Send via email, phone, or wallet address |
| **Claim Flow** | Recipients without wallets receive claim links |
| **Payment Links** | Generate shareable links for fixed or variable amounts |
| **Payment Requests** | Request money with optional memos |
| **Social Feed** | See community transactions, react with likes |
| **Contacts** | Save frequent payees with favorites |
| **Referrals** | Earn rewards for inviting friends |
| **Bridge** | Multi-chain quotes for funding your wallet |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+ (or pnpm/yarn)
- Privy account ([free at privy.io](https://privy.io))

### Installation

```bash
# Clone the monorepo
git clone https://github.com/AY-Space/xUSDT.git
cd xUSDT/plasma-sdk

# Install dependencies
npm install

# Navigate to Plenmo
cd apps/plasma-venmo

# Copy environment template
cp .env.example .env.local
```

### Configuration

Edit `.env.local` with your values:

```bash
# Required
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_secret
DATABASE_URL=your_database_url
RELAYER_PRIVATE_KEY=0x...

# Optional
RESEND_API_KEY=re_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete configuration guide.

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### Run Development Server

```bash
npm run dev
# → http://localhost:3005
```

### Mock Mode (No External Services)

For UI development without Privy/Resend/blockchain:

```bash
NEXT_PUBLIC_MOCK_AUTH=true npm run dev
```

This enables mock wallet, transactions, and local AI fallback.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PLENMO STACK                             │
├─────────────────────────────────────────────────────────────────┤
│  Frontend          │  Next.js 14, Tailwind, Privy React SDK    │
│  API               │  Next.js API Routes, Zod validation       │
│  Database          │  Prisma + PostgreSQL (SQLite for dev)     │
│  Auth              │  Privy embedded wallets + social login    │
│  Blockchain        │  Plasma Mainnet, EIP-3009 gasless         │
│  Email             │  Resend transactional emails              │
│  Analytics         │  PostHog product analytics                │
└─────────────────────────────────────────────────────────────────┘
```

### How Gasless Transfers Work

1. **User signs** an EIP-3009 authorization (off-chain signature)
2. **Relayer submits** the transaction on-chain and pays gas
3. **USDT0 transfers** directly from sender to recipient
4. **User never needs** native tokens (ETH/PLASMA)

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the complete technical deep-dive.

---

## API Reference

All payment operations are exposed via REST APIs:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/submit-transfer` | POST | Execute gasless EIP-3009 transfer |
| `/api/balance` | GET | Check USDT0 balance |
| `/api/payment-links` | GET/POST | Manage payment links |
| `/api/requests` | GET/POST | Payment requests |
| `/api/claims` | GET/POST | Claim flows for unregistered users |
| `/api/contacts` | GET/POST | Contact management |
| `/api/feed` | GET/POST | Social activity feed |
| `/api/bridge/quote` | GET/POST | Multi-chain bridge quotes |

See [docs/API.md](./docs/API.md) for complete API documentation with request/response schemas.

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `RELAYER_PRIVATE_KEY` | Wallet that pays gas fees |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy application ID |
| `PRIVY_APP_SECRET` | Privy server secret |

### Optional

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Email delivery (Resend) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics |
| `NEXT_PUBLIC_TRANSAK_API_KEY` | Fiat on-ramp |
| `NEXT_PUBLIC_GEMINI_API_KEY` | AI assistant |

See [.env.example](./.env.example) for the complete list.

---

## Project Structure

```
plasma-venmo/
├── src/
│   ├── app/
│   │   ├── api/                 # API routes
│   │   │   ├── submit-transfer/ # Gasless transfers
│   │   │   ├── payment-links/   # Payment link CRUD
│   │   │   ├── requests/        # Payment requests
│   │   │   ├── claims/          # Claim flows
│   │   │   ├── contacts/        # Contact management
│   │   │   ├── feed/            # Social feed
│   │   │   ├── bridge/          # Multi-chain bridge
│   │   │   └── ...
│   │   ├── pay/[linkId]/        # Payment link page
│   │   ├── claim/[token]/       # Claim page
│   │   ├── settings/            # User settings
│   │   └── layout.tsx
│   ├── components/              # React components
│   ├── hooks/                   # Custom hooks
│   └── lib/                     # Utilities
├── docs/                        # Documentation
│   ├── API.md                   # API reference
│   ├── ARCHITECTURE.md          # Technical architecture
│   └── DEPLOYMENT.md            # Deployment guide
├── tests/                       # Test suites
│   └── e2e/                     # Playwright E2E tests
├── prisma/                      # Database schema
└── public/                      # Static assets
```

---

## Testing

```bash
# Unit tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# E2E tests (requires dev server running)
npm run test:e2e

# E2E with UI
npm run test:e2e:ui
```

---

## Deployment

### Vercel (Recommended)

1. **Import to Vercel**: Connect your GitHub repo
2. **Set Environment Variables**: Add all required vars
3. **Deploy**: Click deploy

```bash
# Or via CLI
vercel --prod
```

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the complete deployment guide including:
- Vercel configuration
- Database setup (Vercel Postgres, Supabase, Neon)
- Relayer wallet funding
- Privy configuration
- Email setup (Resend)
- Production checklist

---

## Documentation

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | This file—project overview and quick start |
| [docs/API.md](./docs/API.md) | Complete API reference with schemas |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | EIP-3009 flow, Privy, gas sponsorship |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Vercel setup, env config, relayer funding |
| [.env.example](./.env.example) | Environment variable reference |

---

## Key Technologies

| Technology | Purpose |
|------------|---------|
| [Next.js 14](https://nextjs.org) | React framework with App Router |
| [Privy](https://privy.io) | Embedded wallets + authentication |
| [Viem](https://viem.sh) | Ethereum library for TypeScript |
| [Prisma](https://prisma.io) | Database ORM |
| [Tailwind CSS](https://tailwindcss.com) | Utility-first styling |
| [Resend](https://resend.com) | Transactional email |
| [PostHog](https://posthog.com) | Product analytics |

---

## Contributing

1. Read the [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
2. Check existing issues and PRs
3. Follow existing code patterns
4. Write tests for new features
5. Update documentation as needed

```bash
# Development workflow
git checkout -b feature/my-feature
npm run dev
npm test
npm run typecheck
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Open PR
```

---

## Security

### Implemented

- ✅ EIP-3009 signed authorizations
- ✅ Server-side signature validation
- ✅ Rate limiting (Redis-backed)
- ✅ Input validation (Zod schemas)
- ✅ CSRF protection
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Encrypted environment variables

### Best Practices

- Never commit `.env.local` or private keys
- Rotate secrets quarterly
- Monitor relayer balance
- Review [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) before production

---

## Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/AY-Space/xUSDT/issues)
- **Privy**: [privy.io/support](https://privy.io/support)

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ by [Plasma Network](https://plasma.to)**
