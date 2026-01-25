# Plenmo Deployment Guide

Complete guide to deploying Plenmo on Vercel, including environment configuration, relayer setup, and production checklist.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Vercel Deployment](#vercel-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Relayer Wallet Setup](#relayer-wallet-setup)
6. [Privy Configuration](#privy-configuration)
7. [Email Setup (Resend)](#email-setup-resend)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub account with repo access
- [ ] Vercel account (free tier works)
- [ ] Privy account (free at [privy.io](https://privy.io))
- [ ] Relayer wallet with PLASMA tokens
- [ ] (Optional) Resend account for emails
- [ ] (Optional) PostHog account for analytics

---

## Vercel Deployment

### Option 1: Deploy from GitHub (Recommended)

1. **Fork/Push to GitHub**
   ```bash
   # If not already on GitHub
   git remote add origin https://github.com/YOUR_ORG/plenmo.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your GitHub repo
   - Configure project:
     - **Framework Preset:** Next.js
     - **Root Directory:** `apps/plasma-venmo` (if monorepo)
     - **Build Command:** `npm run build`
     - **Output Directory:** `.next`

3. **Add Environment Variables** (see [Environment Configuration](#environment-configuration))

4. **Deploy**
   - Click "Deploy"
   - Wait for build (~2-3 minutes)
   - Your app is live at `https://your-project.vercel.app`

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project root
cd apps/plasma-venmo
vercel

# Follow prompts, then:
vercel --prod  # Deploy to production
```

### Project Settings

The `vercel.json` in the repo configures:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

---

## Environment Configuration

### Required Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/plenmo` | PostgreSQL connection string |
| `RELAYER_PRIVATE_KEY` | `0xabc123...` | Wallet that pays gas fees |
| `RELAYER_ADDRESS` | `0x742d...` | Public address of relayer |
| `MERCHANT_ADDRESS` | `0x5678...` | Address receiving escrow funds |
| `NEXT_PUBLIC_MERCHANT_ADDRESS` | `0x5678...` | Same as above (client-side) |
| `NEXT_PUBLIC_PRIVY_APP_ID` | `clxyz...` | From Privy dashboard |
| `PRIVY_APP_SECRET` | `privy-secret-...` | From Privy dashboard |
| `API_AUTH_SECRET` | `random-32-char-string` | For authenticated API calls |
| `NEXT_PUBLIC_APP_URL` | `https://plenmo.vercel.app` | Your production URL |

### Optional Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | `re_abc123...` | Email delivery |
| `RESEND_FROM_EMAIL` | `Plenmo <noreply@plenmo.app>` | Sender address |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | Analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog instance |
| `NEXT_PUBLIC_TRANSAK_API_KEY` | `...` | Fiat on-ramp |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `...` | AI assistant |
| `KV_REST_API_URL` | `https://...` | Vercel KV (rate limiting) |
| `KV_REST_API_TOKEN` | `...` | Vercel KV token |

### Generating Secrets

```bash
# Generate API_AUTH_SECRET
openssl rand -hex 32

# Generate relayer wallet (if needed)
# Using ethers.js:
node -e "console.log(require('ethers').Wallet.createRandom().privateKey)"
```

### Environment by Stage

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| `NODE_ENV` | `production` | `preview` | `development` |
| `NEXT_PUBLIC_APP_URL` | `https://plenmo.app` | `https://preview.plenmo.app` | `http://localhost:3005` |
| `DATABASE_URL` | Prod DB | Staging DB | Local SQLite |
| `RELAYER_PRIVATE_KEY` | Prod relayer | Test relayer | Test relayer |

---

## Database Setup

### Option 1: Vercel Postgres (Recommended)

1. Go to Vercel Dashboard → Storage → Create Database
2. Select "Postgres"
3. Connect to your project
4. Copy the `DATABASE_URL` (auto-added to env vars)

### Option 2: External PostgreSQL

Use any PostgreSQL provider:
- [Supabase](https://supabase.com) (free tier available)
- [PlanetScale](https://planetscale.com) (MySQL, needs adapter)
- [Neon](https://neon.tech) (serverless Postgres)
- [Railway](https://railway.app)

```bash
# Connection string format
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### Database Migration

After setting `DATABASE_URL`:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with test data
npx prisma db seed
```

For production, use migrations:

```bash
# Create migration
npx prisma migrate dev --name init

# Apply to production
npx prisma migrate deploy
```

---

## Relayer Wallet Setup

The relayer wallet is **critical**—it pays gas fees for all user transactions.

### Creating a Relayer Wallet

```bash
# Option 1: Using cast (Foundry)
cast wallet new

# Option 2: Using ethers.js
node -e "
const { Wallet } = require('ethers');
const w = Wallet.createRandom();
console.log('Address:', w.address);
console.log('Private Key:', w.privateKey);
"

# Option 3: Using Clef or hardware wallet (production recommended)
```

### Funding the Relayer

The relayer needs PLASMA tokens to pay gas:

1. **Get Relayer Address**
   ```bash
   # Derive from private key
   node -e "
   const { Wallet } = require('ethers');
   console.log(new Wallet('YOUR_PRIVATE_KEY').address);
   "
   ```

2. **Send PLASMA to Relayer**
   - Transfer from an existing wallet
   - Bridge from another chain
   - Use a faucet (testnet only)

3. **Recommended Balance**
   
   | Usage Level | Recommended Balance |
   |-------------|---------------------|
   | Testing | 0.1 PLASMA |
   | Low volume (<100 tx/day) | 1 PLASMA |
   | Medium volume (<1000 tx/day) | 10 PLASMA |
   | High volume (>1000 tx/day) | 50+ PLASMA |

### Monitoring Relayer Balance

Set up alerts when balance drops below threshold:

```typescript
// Example monitoring script
import { createPublicClient, http, formatEther } from 'viem';
import { plasmaMainnet } from '@plasma-pay/core';

const client = createPublicClient({
  chain: plasmaMainnet,
  transport: http(),
});

async function checkRelayerBalance() {
  const balance = await client.getBalance({
    address: process.env.RELAYER_ADDRESS,
  });
  
  const balanceEth = parseFloat(formatEther(balance));
  
  if (balanceEth < 1.0) {
    // Send alert (Slack, email, PagerDuty, etc.)
    console.warn(`⚠️ Relayer balance low: ${balanceEth} PLASMA`);
  }
}
```

### Security Best Practices

1. **Dedicated Wallet**: Only use for Plenmo relaying
2. **Minimal Balance**: Keep only what's needed + buffer
3. **Key Rotation**: Rotate quarterly or on suspected compromise
4. **Monitoring**: Alert on unusual activity
5. **Hardware Wallet**: Consider for high-value deployments

---

## Privy Configuration

### 1. Create Privy App

1. Go to [console.privy.io](https://console.privy.io)
2. Click "Create App"
3. Name it (e.g., "Plenmo Production")
4. Copy the **App ID** and **App Secret**

### 2. Configure Login Methods

In Privy Console → Login Methods:

| Method | Recommended |
|--------|-------------|
| Email | ✅ Enable |
| Google | ✅ Enable |
| Apple | ✅ Enable |
| Twitter | Optional |
| SMS | Optional (requires Twilio) |
| Wallet Connect | ✅ Enable (for external wallets) |

### 3. Configure Embedded Wallets

In Privy Console → Embedded Wallets:

- **Create on login**: "Users without wallets"
- **Chain**: Plasma Mainnet (9745)
- **Recovery**: Enable social recovery

### 4. Set Allowed Origins

In Privy Console → Settings → Allowed Origins:

```
https://plenmo.vercel.app
https://plenmo.app
https://*.vercel.app  # For preview deployments
http://localhost:3005  # For local development
```

### 5. Customize Branding

In Privy Console → Branding:

- Upload logo
- Set primary color
- Customize modal text

---

## Email Setup (Resend)

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 3,000 emails/month)
3. Verify your domain or use `@resend.dev` for testing

### 2. Generate API Key

1. Go to API Keys → Create API Key
2. Name it "Plenmo Production"
3. Copy the key (starts with `re_`)

### 3. Configure Domain (Production)

For production, verify your domain:

1. Add domain in Resend → Domains
2. Add DNS records:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
3. Wait for verification (~5-30 minutes)

### 4. Email Templates

Plenmo uses these notification types:

| Type | Trigger |
|------|---------|
| `claim_available` | When sending to unregistered user |
| `payment_request` | When requesting money |
| `payment_received` | When payment completes |

Templates are in `src/lib/email-templates/`.

---

## Post-Deployment Checklist

### Security Checks

- [ ] All environment variables set
- [ ] `RELAYER_PRIVATE_KEY` is encrypted in Vercel
- [ ] No secrets in git history
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Rate limiting functional
- [ ] CORS configured correctly

### Functionality Checks

- [ ] Homepage loads
- [ ] Login via Privy works
- [ ] Embedded wallet created
- [ ] Test transfer succeeds
- [ ] Claim flow works
- [ ] Emails delivered (if configured)

### Performance Checks

- [ ] Lighthouse score > 90
- [ ] API responses < 500ms
- [ ] No console errors
- [ ] Analytics tracking (if configured)

### Monitoring Setup

- [ ] Relayer balance alerts
- [ ] Error tracking (Sentry recommended)
- [ ] Uptime monitoring
- [ ] Log aggregation

---

## Monitoring & Maintenance

### Vercel Analytics

Enable in Vercel Dashboard → Analytics:

- Web Vitals (LCP, FID, CLS)
- Traffic metrics
- Error rates

### Custom Monitoring

```typescript
// src/lib/monitoring.ts
export async function trackMetric(name: string, value: number) {
  // Send to your monitoring service
  await fetch('https://metrics.example.com/track', {
    method: 'POST',
    body: JSON.stringify({ name, value, timestamp: Date.now() }),
  });
}

// Usage in API routes
trackMetric('transfer_success', 1);
trackMetric('transfer_amount', parseFloat(amount));
```

### Regular Maintenance Tasks

| Task | Frequency |
|------|-----------|
| Check relayer balance | Daily |
| Review error logs | Weekly |
| Update dependencies | Monthly |
| Rotate API secrets | Quarterly |
| Database backup verification | Monthly |
| Security audit | Annually |

---

## Troubleshooting

### "Relayer not configured"

**Cause**: Missing or invalid `RELAYER_PRIVATE_KEY`

**Fix**:
1. Verify env var is set in Vercel
2. Ensure it starts with `0x`
3. Redeploy after adding

### "Service not configured"

**Cause**: Missing Privy credentials

**Fix**:
1. Set `NEXT_PUBLIC_PRIVY_APP_ID`
2. Set `PRIVY_APP_SECRET`
3. Verify in Privy console that app exists

### "Database connection failed"

**Cause**: Invalid `DATABASE_URL` or network issues

**Fix**:
1. Verify connection string format
2. Check database is accessible from Vercel's IPs
3. Ensure SSL is enabled (`?sslmode=require`)
4. Run `prisma db push` to sync schema

### "Transfer failed" on-chain

**Cause**: Various

**Debug**:
```typescript
// Check relayer balance
const balance = await publicClient.getBalance({ address: RELAYER_ADDRESS });
console.log('Relayer balance:', formatEther(balance));

// Check user USDT0 balance
const usdt0Balance = await publicClient.readContract({
  address: USDT0_ADDRESS,
  abi: ['function balanceOf(address) view returns (uint256)'],
  functionName: 'balanceOf',
  args: [userAddress],
});
console.log('User USDT0:', formatUnits(usdt0Balance, 6));
```

Common causes:
- Relayer out of gas
- User insufficient USDT0
- Authorization expired
- Nonce already used

### Rate limiting not working

**Cause**: Missing Vercel KV

**Fix**:
1. Add Vercel KV storage (Storage → Create → KV)
2. Connect to project
3. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set

### Emails not sending

**Cause**: Resend misconfiguration

**Debug**:
1. Check `RESEND_API_KEY` is set
2. Verify domain is verified in Resend
3. Check Resend dashboard for delivery status
4. Review Vercel function logs for errors

---

## Environment Variable Reference

### Complete .env.example

```bash
# =============================================================================
# Plenmo Production Environment Variables
# =============================================================================

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:pass@host:5432/plenmo?sslmode=require"

# Relayer Wallet (pays gas for users)
RELAYER_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f..."
RELAYER_PRIVATE_KEY="0xabc123..."

# Merchant/Escrow Address
MERCHANT_ADDRESS="0x5678..."
NEXT_PUBLIC_MERCHANT_ADDRESS="0x5678..."

# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID="clxyz123..."
PRIVY_APP_SECRET="privy-secret-..."

# API Security
API_AUTH_SECRET="your-32-char-random-string"

# Application URL
NEXT_PUBLIC_APP_URL="https://plenmo.vercel.app"

# Plasma Chain (constants)
NEXT_PUBLIC_PLASMA_CHAIN_ID="9745"
NEXT_PUBLIC_PLASMA_RPC="https://rpc.plasma.to"

# Email (Resend) - Optional
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Plenmo <noreply@plenmo.app>"

# Analytics (PostHog) - Optional
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"

# Rate Limiting (Vercel KV) - Optional but recommended
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."

# Fiat On-ramp (Transak) - Optional
NEXT_PUBLIC_TRANSAK_API_KEY="..."

# AI Assistant (Gemini) - Optional
NEXT_PUBLIC_GEMINI_API_KEY="..."
```

---

## Quick Deploy Commands

```bash
# Full deployment flow
git checkout main
git pull origin main

# Run tests
npm test
npm run typecheck

# Deploy to preview
vercel

# Review preview deployment...

# Deploy to production
vercel --prod

# Check deployment
vercel logs --follow
```

---

## Support

- **Documentation**: This file + README.md + API.md
- **Issues**: [GitHub Issues](https://github.com/AY-Space/xUSDT/issues)
- **Privy Support**: [privy.io/support](https://privy.io/support)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
