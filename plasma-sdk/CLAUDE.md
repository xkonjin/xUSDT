# Plasma SDK

A monorepo of payment applications and shared packages built on Plasma Chain, enabling gasless USDT0 transfers via EIP-3009 authorization signatures.

## Codebase Overview

**Stack**: Next.js 14 (App Router), TypeScript, Prisma, Privy Auth, Tailwind CSS, Turborepo

**Structure**: 
- `apps/` - Applications (plasma-venmo/Plenmo, plasma-stream, bill-split, subkiller, mobile, telegram-webapp, splitzy-bot, plasma-predictions)
- `packages/` - Shared packages (@plasma-pay/core, db, privy-auth, gasless, share, ui, analytics, aggregator, x402)

For detailed architecture, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Key Focus Areas

### Plenmo Payment System (apps/plasma-venmo)
- Main P2P payment app - "Venmo for crypto"
- Core files: `src/components/SendMoneyForm.tsx`, `src/lib/send.ts`, `src/app/api/submit-transfer/`
- Hooks: `usePlasmaWallet()`, `useGaslessTransfer()`, `useUSDT0Balance()`

### External Wallet Integration
- Allows MetaMask/Rabby payments via `ExternalWalletPay.tsx`
- Uses `useConnectExternalWallet()` and `useAllWallets()` hooks
- USDT0 address: `0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb`

### Bridge Deposit Feature
- Multi-aggregator: LI.FI, deBridge, Squid, Across
- Files: `BridgeDeposit.tsx`, `FundWallet.tsx`, `/api/bridge/*`
- Supports 7 source chains (ETH, ARB, OP, BASE, MATIC, BNB, AVAX)

### Vercel Deployment
- **Critical**: Deploy from `apps/plasma-venmo`, never set rootDirectory
- Root vercel.json uses `turbo build --filter=@plasma-pay/venmo`
- Node.js 20.x required (not 24.x)

### PostHog Analytics
- Config: `src/lib/posthog.ts`, env vars `NEXT_PUBLIC_POSTHOG_KEY`/`HOST`
- Tracks bridge events: `bridge_initiated`, `bridge_success`, `bridge_error`

## Quick Start

```bash
npm install        # Install dependencies
npm run dev        # Start all apps via Turbo
npm run build      # Build all packages
npm test           # Run E2E tests
```

## Key Apps

| App | Port | Purpose |
|-----|------|---------|
| `plasma-venmo` | 3002 | Main P2P payment app (Plenmo) |
| `plasma-stream` | 3003 | Streaming payments |
| `bill-split` | 3004 | Bill splitting |
| `subkiller` | 3001 | Subscription management |

## Key Packages

| Package | Purpose |
|---------|---------|
| `@plasma-pay/core` | Types, constants, chain config |
| `@plasma-pay/db` | Prisma client & data helpers |
| `@plasma-pay/privy-auth` | Auth wrapper with wallet hooks |
| `@plasma-pay/gasless` | EIP-3009 transfer utilities |
| `@plasma-pay/share` | Social sharing (WhatsApp, SMS, Telegram) |
| `@plasma-pay/ui` | Shared components & AI Assistant |

## Environment Setup

See `apps/ENV_SETUP.md` for complete environment variable documentation.

**Required for plasma-venmo**:
- `NEXT_PUBLIC_PRIVY_APP_ID` / `PRIVY_APP_ID` / `PRIVY_APP_SECRET` - Privy auth
- `DATABASE_URL` - PostgreSQL connection

**Optional**:
- `RESEND_API_KEY` - Email notifications
- `NEXT_PUBLIC_TRANSAK_API_KEY` - Fiat on-ramp
- `NEXT_PUBLIC_GEMINI_API_KEY` - AI Assistant

## Important Notes

- **EIP-712 Domain**: Token name must be `"USDT0"` (not `"USD₮0"`) for signature validation
- **Gasless Limits**: 10 transfers/day, 10k USDT0/day volume per address (resets UTC midnight)
- **Claims**: Token is SHA-256 hashed before storage, only returned on creation

## Vercel Deployment

**CRITICAL**: This monorepo has multiple Vercel projects. When deploying:

1. **Always cd into the specific app directory** before running `vercel`
2. **Never deploy from the monorepo root** - use `cd apps/plasma-venmo`
3. **Run verification script first**: `./scripts/verify-vercel.sh`
4. **Check dashboard settings** match:
   - Root Directory: empty (not `apps/plasma-venmo`)
   - Node.js Version: 20.x (not 24.x)

See `apps/plasma-venmo/AGENTS.md` → "Vercel Deployment Rules" for detailed troubleshooting.
