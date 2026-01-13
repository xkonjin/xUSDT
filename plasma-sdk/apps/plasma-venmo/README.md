# Plenmo (Plasma Venmo)

**Zero-fee P2P payments powered by Plasma Chain**

Plenmo is a Venmo-style payment application that enables instant, gasless USDT0 transfers on the Plasma network. Users can send money to anyone via email, phone, or wallet address - even if the recipient doesn't have an account yet.

![Plenmo Screenshot](https://plasma.to/plenmo-hero.png)

## Features

### Core Payments
- **Send Money** - Transfer USDT0 to email, phone, or wallet address
- **Request Money** - Create payment requests with optional memos
- **Payment Links** - Generate shareable links for fixed or variable amounts
- **Claim Flow** - Recipients without wallets receive claim links via email

### Wallet Management
- **Embedded Wallet** - Privy-powered non-custodial wallets
- **External Wallets** - Connect MetaMask, Rabby, Rainbow, etc.
- **Fund Wallet** - Buy crypto via Transak or transfer from external wallet
- **QR Codes** - Scan-to-pay and receive via QR

### Social Features
- **Activity Feed** - See public transactions from the community
- **Contacts** - Save frequent payees with favorites
- **Privacy Controls** - Set transaction visibility (public/private)
- **Reactions** - Like transactions in the feed

### Notifications
- **Email Notifications** - Payment received, claim available, request completed
- **Branded Templates** - Professional HTML email templates via Resend

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 14)                    │
├─────────────────────────────────────────────────────────────────┤
│  Pages          │  Components           │  Hooks                │
│  ├─ /           │  ├─ SendMoneyForm     │  ├─ usePlasmaWallet   │
│  ├─ /pay        │  ├─ RequestMoneyForm  │  ├─ useUSDT0Balance   │
│  ├─ /pay/[id]   │  ├─ PaymentRequests   │  ├─ useContacts       │
│  ├─ /claim/[t]  │  ├─ PaymentLinks      │  └─ useGasSponsorship │
│  ├─ /invite     │  ├─ SocialFeed        │                       │
│  └─ /settings   │  ├─ ContactList       │                       │
│                 │  ├─ FundWallet        │                       │
│                 │  ├─ WalletManager     │                       │
│                 │  └─ AvatarAssistant   │                       │
├─────────────────┴───────────────────────┴───────────────────────┤
│                           API Routes                             │
├─────────────────────────────────────────────────────────────────┤
│  /api/submit-transfer    - Execute gasless EIP-3009 transfers   │
│  /api/resolve-recipient  - Resolve email/phone to wallet        │
│  /api/claims/*           - Create and execute claim flows       │
│  /api/requests/*         - Payment request management           │
│  /api/payment-links/*    - Generate and manage payment links    │
│  /api/contacts/*         - Contact/friend management            │
│  /api/feed               - Social activity feed                 │
│  /api/notify             - Email notification dispatch          │
│  /api/search             - User and transaction search          │
│  /api/avatar/*           - AI assistant (Gemini-powered)        │
├─────────────────────────────────────────────────────────────────┤
│                        External Services                         │
├─────────────────────────────────────────────────────────────────┤
│  Privy          - Authentication & embedded wallets             │
│  Plasma Chain   - L2 blockchain for gasless transactions        │
│  Resend         - Transactional email delivery                  │
│  Transak        - Fiat on-ramp integration                      │
│  Gemini AI      - Avatar assistant responses                    │
│  PostHog        - Product analytics                             │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Privy (embedded wallets + social login) |
| Database | Prisma + SQLite (dev) / PostgreSQL (prod) |
| Blockchain | Viem + Plasma Chain RPC |
| Email | Resend SDK |
| Testing | Jest + Playwright |
| AI | Google Gemini API |

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Privy account (free at privy.io)

### Installation

```bash
# Clone the monorepo
git clone https://github.com/AY-Space/xUSDT.git
cd xUSDT/plasma-sdk

# Install dependencies
npm install

# Set up environment
cd apps/plasma-venmo
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Development Mode (No External Services)

For UI development without Privy/Resend/etc:

```bash
NEXT_PUBLIC_MOCK_AUTH=true npm run dev
```

This enables:
- Mock wallet with test address
- Mock recipient resolution
- Mock transaction submission
- Local AI assistant fallback

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Prisma database connection |
| `RELAYER_PRIVATE_KEY` | Yes | Private key for gas sponsorship |
| `MERCHANT_ADDRESS` | Yes | Address receiving escrowed funds |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy application ID |
| `PRIVY_APP_SECRET` | Yes | Privy server secret |
| `RESEND_API_KEY` | No | Resend API key for emails |
| `NEXT_PUBLIC_TRANSAK_API_KEY` | No | Transak fiat on-ramp |
| `GEMINI_API_KEY` | No | Google Gemini for AI assistant |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog analytics |

## Payment Flows

### Direct Transfer (Registered User)
```
1. User enters recipient email/phone/address
2. /api/resolve-recipient → returns wallet address
3. User signs EIP-3009 authorization
4. /api/submit-transfer → relayer executes gasless transfer
5. Success! Recipient balance updated instantly
```

### Claim Flow (Unregistered User)
```
1. User sends to unregistered email
2. /api/resolve-recipient → returns needsClaim: true
3. Funds transferred to escrow, claim token generated
4. /api/claims → creates claim record, sends email
5. Recipient clicks link → /claim/[token]
6. Recipient signs up (Privy) → claims funds
7. /api/claims/[token] POST → escrow transfers to recipient
```

### Payment Link Flow
```
1. Creator generates link via /api/payment-links
2. Link shared: plenmo.com/pay/[linkId]
3. Payer visits link, sees amount/memo
4. Payer signs transfer to creator's address
5. Transaction executed via relayer
```

## Project Structure

```
plasma-venmo/
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── claims/         # Claim creation and execution
│   │   │   ├── contacts/       # Contact management
│   │   │   ├── feed/           # Social activity feed
│   │   │   ├── notify/         # Email notifications
│   │   │   ├── payment-links/  # Payment link CRUD
│   │   │   ├── requests/       # Payment requests
│   │   │   ├── resolve-recipient/
│   │   │   ├── search/         # User/transaction search
│   │   │   ├── submit-transfer/
│   │   │   └── avatar/         # AI assistant
│   │   ├── claim/[token]/      # Claim page
│   │   ├── pay/                # Pay page
│   │   │   └── [linkId]/       # Payment link page
│   │   ├── invite/             # Referral page
│   │   ├── settings/           # User settings
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main dashboard
│   │   └── providers.tsx
│   ├── components/
│   │   ├── SendMoneyForm.tsx
│   │   ├── RequestMoneyForm.tsx
│   │   ├── PaymentRequests.tsx
│   │   ├── PaymentLinks.tsx
│   │   ├── SocialFeed.tsx
│   │   ├── ContactList.tsx
│   │   ├── FundWallet.tsx
│   │   ├── WalletManager.tsx
│   │   ├── AvatarAssistant.tsx
│   │   └── ui/                 # Shared UI components
│   ├── lib/
│   │   ├── send.ts             # Payment logic
│   │   ├── schemas.ts          # Zod validation
│   │   ├── csrf.ts             # CSRF protection
│   │   ├── rate-limiter.ts     # API rate limiting
│   │   ├── retry.ts            # Retry with backoff
│   │   └── avatar/             # AI assistant helpers
│   └── hooks/
│       └── useGasSponsorship.ts
├── tests/
│   └── e2e/                    # Playwright E2E tests
├── prisma/
│   └── schema.prisma           # (uses @plasma-pay/db)
└── thoughts/
    └── shared/handoffs/        # Development context
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests (requires running dev server)
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Security

### Implemented
- **CSRF Protection** - Token-based CSRF prevention
- **Rate Limiting** - Per-IP and per-user limits
- **Input Validation** - Zod schemas on all endpoints
- **Security Headers** - X-Frame-Options, CSP, etc.
- **Server-only Secrets** - Private keys never exposed to client

### Best Practices
- Never commit `.env.local` or private keys
- Use environment variables for all secrets
- Review `PRODUCTION_ROADMAP.md` before deploying

## Troubleshooting

### "Relayer not configured"
Set `RELAYER_PRIVATE_KEY` in `.env.local`. This wallet pays gas fees.

### "Service not configured" (resolve-recipient)
Set `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_SECRET`.

### Mock mode issues
Ensure `NEXT_PUBLIC_MOCK_AUTH=true` is set before starting the dev server.

### Database errors
Run `npx prisma generate && npx prisma db push` to sync schema.

## Contributing

1. Read `PRODUCTION_ROADMAP.md` for current priorities
2. Check `prd.json` for task tracking
3. Follow existing code patterns
4. Write tests for new features
5. Update relevant handoff docs in `thoughts/shared/handoffs/`

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ by [Plasma Network](https://plasma.to)**
