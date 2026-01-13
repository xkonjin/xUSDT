# Plenmo Agent Guide

This document provides comprehensive context for AI agents working on the Plenmo codebase. It covers architecture, patterns, conventions, and common tasks.

## Project Overview

Plenmo is a P2P payment application enabling zero-fee USDT0 transfers on Plasma Chain. Think "Venmo but crypto" - users send money via email/phone/address, recipients without wallets get claim links.

### Core Value Proposition
- **Zero fees** - Relayer sponsors all gas costs
- **No crypto jargon** - Users see dollars, not wei
- **Non-custodial** - Privy embedded wallets, users own keys
- **Instant** - 2-second finality on Plasma Chain

## Architecture Deep Dive

### Payment Flow States

```
                    ┌─────────────────┐
                    │   User Input    │
                    │ (email/phone/   │
                    │  address)       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ resolve-recipient│
                    │      API        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼─────┐ ┌──────▼──────┐ ┌─────▼─────┐
     │   DIRECT     │ │  CLAIM FLOW │ │  INVALID  │
     │  (has wallet)│ │ (no wallet) │ │  (error)  │
     └───────┬──────┘ └──────┬──────┘ └───────────┘
             │               │
    ┌────────▼────────┐  ┌───▼───────────────┐
    │ Sign EIP-3009   │  │ Sign EIP-3009     │
    │ Authorization   │  │ to ESCROW address │
    └────────┬────────┘  └───┬───────────────┘
             │               │
    ┌────────▼────────┐  ┌───▼───────────────┐
    │ submit-transfer │  │ Create Claim +    │
    │ (relayer pays   │  │ Send Email        │
    │  gas)           │  └───┬───────────────┘
    └────────┬────────┘      │
             │           ┌───▼───────────────┐
    ┌────────▼────────┐  │ Recipient Signs   │
    │   SUCCESS       │  │ Up & Claims       │
    └─────────────────┘  └───┬───────────────┘
                             │
                         ┌───▼───────────────┐
                         │ Escrow → Recipient│
                         │ (relayer pays gas)│
                         └───────────────────┘
```

### EIP-3009 Gasless Transfers

USDT0 on Plasma supports EIP-3009 `transferWithAuthorization`. This allows:
1. User signs typed data (no gas needed)
2. Relayer submits transaction (pays gas)
3. Funds transfer from user to recipient

```typescript
// Signing flow in lib/send.ts
const params = createTransferParams(from, to, amount);
const typedData = buildTransferAuthorizationTypedData(params, {
  chainId: PLASMA_MAINNET_CHAIN_ID,
  tokenAddress: USDT0_ADDRESS,
});
const signature = await wallet.signTypedData(typedData);
// Submit to relayer...
```

### Database Schema (Prisma)

Key models in `@plasma-pay/db`:

```prisma
model Claim {
  id              String    @id @default(cuid())
  tokenHash       String    @unique  // SHA256 of claim token
  senderAddress   String
  senderEmail     String?
  recipientEmail  String?
  recipientPhone  String?
  authorization   String    // JSON: signed EIP-3009 params
  amount          Float
  currency        String    @default("USDT0")
  memo            String?
  status          String    @default("pending")  // pending/claimed/expired
  claimedBy       String?
  claimedAt       DateTime?
  txHash          String?
  expiresAt       DateTime
  createdAt       DateTime  @default(now())
}

model PaymentRequest {
  id            String   @id @default(cuid())
  fromAddress   String   // Requester's wallet
  fromEmail     String?
  toIdentifier  String   // email/phone/address of payer
  toAddress     String?  // Resolved wallet if known
  amount        Float
  currency      String   @default("USDT0")
  memo          String?
  status        String   @default("pending")
  txHash        String?
  createdAt     DateTime @default(now())
  expiresAt     DateTime?
}

model PaymentLink {
  id             String   @id @default(cuid())
  creatorAddress String
  amount         Float?   // null = any amount
  currency       String   @default("USDT0")
  memo           String?
  uses           Int      @default(0)
  maxUses        Int?
  isActive       Boolean  @default(true)
  expiresAt      DateTime?
  createdAt      DateTime @default(now())
}

model Contact {
  id             String   @id @default(cuid())
  ownerAddress   String
  contactAddress String?
  name           String
  email          String?
  phone          String?
  isFavorite     Boolean  @default(false)
  lastPayment    DateTime?
  createdAt      DateTime @default(now())
  
  @@unique([ownerAddress, contactAddress])
}

model Activity {
  id            String   @id @default(cuid())
  type          String   // payment/claim/request
  actorAddress  String
  actorName     String
  targetAddress String
  targetName    String
  amount        Float
  currency      String
  memo          String?
  txHash        String?
  visibility    String   @default("public")
  likes         Int      @default(0)
  createdAt     DateTime @default(now())
}

model Notification {
  id              String   @id @default(cuid())
  recipientEmail  String?
  recipientAddress String?
  type            String   // claim_available/payment_received/etc
  title           String
  body            String
  data            String?  // JSON
  status          String   @default("pending")
  sentAt          DateTime?
  relatedType     String?
  relatedId       String?
  createdAt       DateTime @default(now())
}
```

## Code Patterns

### API Route Pattern

All API routes follow this structure:

```typescript
// src/app/api/[endpoint]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { validateRequest, someSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    // 1. Parse and validate input
    const body = await request.json();
    const result = validateRequest(someSchema, body);
    if (!result.success) {
      return NextResponse.json(result.error, { status: 400 });
    }
    const { field1, field2 } = result.data;

    // 2. Business logic
    const record = await prisma.model.create({
      data: { field1, field2 },
    });

    // 3. Return success
    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    );
  }
}
```

### Component Pattern

Client components use this structure:

```typescript
"use client";

import { useState, useEffect } from "react";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";

interface ComponentProps {
  walletAddress?: string;
  onSuccess?: () => void;
}

export function ComponentName({ walletAddress, onSuccess }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataType | null>(null);

  useEffect(() => {
    // Fetch data on mount
  }, [walletAddress]);

  const handleAction = async () => {
    setLoading(true);
    setError(null);
    try {
      // Do something
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState />;

  return (
    <div className="clay-card p-4">
      {/* Component content */}
    </div>
  );
}
```

### Mock Mode Pattern

For development without external services:

```typescript
// In API routes
const isMockMode = () => process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

export async function POST(request: Request) {
  // Early return for mock mode
  if (isMockMode()) {
    return NextResponse.json({
      success: true,
      mock: true,
      txHash: `0xmock${Date.now().toString(16)}`,
    });
  }

  // Real implementation...
}
```

## Styling Conventions

### Tailwind Classes

Use these utility classes for consistent design:

```css
/* Glass cards */
.clay-card { @apply bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl; }
.liquid-glass { @apply bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl; }

/* Buttons */
.btn-primary { @apply bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)] text-black font-semibold rounded-2xl px-6 py-3; }
.btn-secondary { @apply bg-white/10 text-white font-medium rounded-xl px-4 py-2 hover:bg-white/20; }

/* Gradient text */
.gradient-text { @apply bg-gradient-to-r from-[rgb(0,212,255)] to-purple-400 bg-clip-text text-transparent; }

/* Brand color */
--accent: rgb(0, 212, 255);  /* Cyan */
```

### Component Hierarchy

```
Page (layout + data fetching)
└── Section (clay-card wrapper)
    └── Header (title + actions)
    └── Content (forms, lists)
    └── Footer (pagination, CTAs)
```

## Common Tasks

### Adding a New API Endpoint

1. Create route file: `src/app/api/[endpoint]/route.ts`
2. Add Zod schema in `src/lib/schemas.ts`
3. Add tests in `src/lib/__tests__/`
4. Update OpenAPI docs if applicable

### Adding a New Component

1. Create file: `src/components/ComponentName.tsx`
2. Add "use client" if using hooks/state
3. Follow component pattern above
4. Add Storybook story if complex

### Modifying Payment Flow

1. Update `src/lib/send.ts` for client-side logic
2. Update relevant API route for server-side
3. Update `SendMoneyForm.tsx` for UI changes
4. Test with mock mode first, then real wallet

### Adding Database Model

1. Update `packages/db/prisma/schema.prisma`
2. Run `npx prisma generate && npx prisma db push`
3. Create API routes for CRUD
4. Add validation schemas

## Testing Strategy

### Unit Tests (Jest)

```typescript
// src/lib/__tests__/example.test.ts
describe('functionName', () => {
  it('handles normal case', () => {
    expect(functionName(input)).toBe(expected);
  });

  it('handles edge case', () => {
    expect(() => functionName(badInput)).toThrow();
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/flow.spec.ts
test('send money flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started' }).click();
  // ... continue flow
  await expect(page.getByText('Success')).toBeVisible();
});
```

## Error Handling

### Client-Side Errors

```typescript
try {
  await sendMoney(wallet, options);
} catch (error) {
  if (error.message.includes('insufficient')) {
    setError('Insufficient balance');
  } else if (error.message.includes('rejected')) {
    setError('Transaction rejected');
  } else {
    setError('Something went wrong. Please try again.');
  }
}
```

### API Errors

Return consistent error format:

```typescript
return NextResponse.json(
  { 
    error: 'Human-readable message',
    code: 'SPECIFIC_ERROR_CODE',  // Optional
    details: { ... }              // Optional debug info
  },
  { status: 400 }
);
```

## Performance Considerations

### Data Fetching

- Use SWR or React Query for client-side caching
- Implement pagination for lists (20-50 items per page)
- Add loading skeletons, not spinners

### Bundle Size

- Dynamically import heavy components
- Use `next/dynamic` for modals
- Tree-shake unused icons from lucide-react

### Database

- Add indexes for frequently queried fields
- Use `select` to fetch only needed columns
- Batch operations where possible

## Security Checklist

- [ ] Validate all inputs with Zod schemas
- [ ] Use CSRF tokens for state-changing requests
- [ ] Rate limit sensitive endpoints
- [ ] Never expose private keys to client
- [ ] Sanitize user content before display
- [ ] Use parameterized queries (Prisma handles this)
- [ ] Set security headers in middleware

## Debugging Tips

### Mock Mode
```bash
NEXT_PUBLIC_MOCK_AUTH=true npm run dev
```

### Database Queries
```bash
# View database
npx prisma studio
```

### Network Requests
Check browser DevTools Network tab for API responses.

### Blockchain Transactions
View on [Plasma Scan](https://scan.plasma.to/tx/{hash}).

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main dashboard |
| `src/lib/send.ts` | Payment execution logic |
| `src/lib/schemas.ts` | Input validation |
| `src/app/api/submit-transfer/route.ts` | Relayer endpoint |
| `src/app/api/resolve-recipient/route.ts` | Email/phone lookup |
| `src/app/api/claims/route.ts` | Claim creation |
| `src/components/SendMoneyForm.tsx` | Send UI |
| `packages/db/prisma/schema.prisma` | Database models |

## Contact & Resources

- **Plasma Docs**: https://docs.plasma.to
- **Privy Docs**: https://docs.privy.io
- **USDT0 Contract**: See `@plasma-pay/core` for contract addresses
- **Plasma Chain ID**: `9745`
- **RPC**: `https://rpc.plasma.to`

---

## Session Learnings & Maintenance Guide

This section documents learnings from development sessions to ensure continuous improvement.

### Documentation Maintenance Rules

**ALWAYS update these files after every session:**

1. **AGENTS.md** - Add new patterns, fixes, and learnings
2. **README.md** - Update if features/setup changed
3. **Session Learnings** - Document what was fixed and why

### Common Issues & Fixes

#### Mock Mode Issues
- **Problem**: `@privy-io/server-auth` fails to load due to `@hpke/*` module errors
- **Solution**: Check `isMockMode()` BEFORE loading Privy client, not after
- **Files**: `api/resolve-recipient/route.ts`, `api/submit-transfer/route.ts`

#### Lint Warnings

| Warning | Fix |
|---------|-----|
| `useEffect` missing dependency | Add `// eslint-disable-next-line react-hooks/exhaustive-deps` when function is defined in component |
| `<img>` element | Use `<Image>` from `next/image` with `unoptimized` prop for external URLs |
| Unused variables | Prefix with `_` or remove if truly unused |
| Import order in tests | Move imports ABOVE `jest.mock()` calls |

#### Type Errors
- Always verify variables are used before removing them (check entire file)
- Run `npm run typecheck` after lint fixes

### Pre-Commit Checklist

```bash
# Run before every commit
npm run lint      # Must pass with 0 warnings
npm run typecheck # Must pass
npm run test      # In app directory for unit tests
```

### UI Design Guidelines (Updated Jan 2026)

**Target Aesthetic**: Consumer-friendly claymorphism, bright and colorful

**Reference Color Palettes**:
- **Cash App**: `#00D54B` (green), `#000000` (black), `#FFFFFF` (white)
- **Venmo**: `#008CFF` (blue), `#FFFFFF` (white)
- **Revolut**: `#191C1F` (shark), `#7F84F6` (cornflower blue)

**Our Palette** (Plenmo):
- Primary: `#00D4FF` (cyan - trust, tech)
- Secondary: `#A855F7` (purple - premium)
- Success: `#22C55E` (green)
- Background: Soft gradients, not pure black
- Cards: Claymorphism with soft shadows

**Claymorphism Recipe**:
```css
.clay-card {
  background: linear-gradient(145deg, #f0f0f0, #ffffff);
  border-radius: 20px;
  box-shadow: 
    8px 8px 16px rgba(0, 0, 0, 0.1),
    -8px -8px 16px rgba(255, 255, 255, 0.8);
}
```

### Session Log Template

When completing a session, add entry:

```markdown
### Session: [DATE]
**Focus**: [What was worked on]
**Fixed**: 
- Issue 1 → Solution
- Issue 2 → Solution
**Added**:
- New feature/file
**Learnings**:
- Key insight for future sessions
```

---

*Last updated: January 2026*
