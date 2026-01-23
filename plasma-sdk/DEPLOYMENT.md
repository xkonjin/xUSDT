# Plenmo Deployment Guide

Complete guide for deploying Plenmo to Vercel production.

---

## Prerequisites

- GitHub account with xUSDT repository access
- Vercel account (free tier works)
- Privy account (https://privy.io)
- Database (Vercel Postgres or external)
- Wallet with USDT0 for relayer
- Domain name (optional)

---

## Step 1: Privy Setup

1. Go to https://dashboard.privy.io
2. Click "Create New App"
3. Name it "Plenmo Production"
4. Copy the **App ID** and **App Secret**
5. Configure Allowed Domains:
   - Add your Vercel domain: `your-app.vercel.app`
   - Add custom domain if you have one
6. Configure Callback URLs:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/api/auth/callback`

**Save these values:**
```
NEXT_PUBLIC_PRIVY_APP_ID=clxxx...
PRIVY_APP_SECRET=xxx...
```

---

## Step 2: Database Setup

### Option A: Vercel Postgres (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
cd plasma-sdk
vercel link

# Create Postgres database
vercel postgres create

# Pull environment variables
vercel env pull .env.local
```

Your `DATABASE_URL` will be automatically added.

### Option B: External Database (Supabase/PlanetScale)

1. Create database on your provider
2. Get connection string
3. Format: `postgresql://user:password@host:5432/database`
4. Save as `DATABASE_URL`

---

## Step 3: Wallet Setup

### Relayer Wallet (for gasless transactions)

```bash
# Generate new wallet
cast wallet new

# Save the output:
RELAYER_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...

# Fund with USDT0 on Plasma Network
# Send at least 100 USDT0 to the relayer address
```

### Merchant Wallet (for receiving payments)

Use your existing business wallet or create a new one:
```
MERCHANT_ADDRESS=0x...
NEXT_PUBLIC_MERCHANT_ADDRESS=0x...
```

---

## Step 4: API Keys

### API Auth Secret

```bash
# Generate secure random string
openssl rand -base64 32

# Save as:
API_AUTH_SECRET=xxx...
```

### Resend (Email Service)

1. Go to https://resend.com
2. Sign up and verify domain
3. Create API key
4. Save:
```
RESEND_API_KEY=re_xxx...
RESEND_FROM_EMAIL=Plenmo <noreply@yourdomain.com>
```

### PostHog (Analytics - Optional)

1. Go to https://posthog.com
2. Create free account
3. Get project API key
4. Save:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## Step 5: Vercel Project Setup

### Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import `xkonjin/xUSDT` repository
3. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `plasma-sdk`
   - **Build Command:** `npm run vercel-build`
   - **Output Directory:** `apps/plasma-venmo/.next`
   - **Install Command:** `npm install`
   - **Node Version:** 18.x

### Via Vercel CLI

```bash
cd plasma-sdk
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory to plasma-sdk
```

---

## Step 6: Environment Variables

### Add to Vercel Dashboard

Go to Project Settings > Environment Variables and add:

**Required:**
```
NEXT_PUBLIC_PRIVY_APP_ID=clxxx...
PRIVY_APP_SECRET=xxx...
DATABASE_URL=postgresql://...
RELAYER_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
MERCHANT_ADDRESS=0x...
NEXT_PUBLIC_MERCHANT_ADDRESS=0x...
API_AUTH_SECRET=xxx...
RESEND_API_KEY=re_xxx...
RESEND_FROM_EMAIL=Plenmo <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Optional:**
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_GEMINI_API_KEY=xxx...
```

**Public (auto-configured):**
```
NEXT_PUBLIC_PLASMA_CHAIN_ID=9745
NEXT_PUBLIC_PLASMA_RPC=https://rpc.plasma.to
```

### Via Vercel CLI

```bash
vercel env add NEXT_PUBLIC_PRIVY_APP_ID production
vercel env add PRIVY_APP_SECRET production
vercel env add DATABASE_URL production
vercel env add RELAYER_ADDRESS production
vercel env add RELAYER_PRIVATE_KEY production
vercel env add MERCHANT_ADDRESS production
vercel env add NEXT_PUBLIC_MERCHANT_ADDRESS production
vercel env add API_AUTH_SECRET production
vercel env add RESEND_API_KEY production
vercel env add RESEND_FROM_EMAIL production
vercel env add NEXT_PUBLIC_APP_URL production
```

---

## Step 7: Deploy

### Automatic Deployment

Push to main branch:
```bash
git push origin main
```

Vercel will automatically deploy.

### Manual Deployment

```bash
cd plasma-sdk
vercel --prod
```

---

## Step 8: Post-Deployment

### 1. Verify Build

Check Vercel deployment logs:
- All packages built successfully
- Next.js build completed
- No TypeScript errors

### 2. Test Authentication

1. Visit your deployed URL
2. Click "Connect Wallet"
3. Verify Privy modal opens
4. Complete authentication flow
5. Check user is logged in

### 3. Test Payment Flow

1. Fund your wallet with USDT0
2. Try sending payment
3. Verify transaction completes
4. Check recipient receives funds

### 4. Verify Database

1. Check database tables created
2. Verify user records saved
3. Check transaction history

### 5. Configure Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your domain
3. Configure DNS records
4. Update Privy allowed domains
5. Update `NEXT_PUBLIC_APP_URL`

---

## Troubleshooting

### Build Fails: "Module not found: @plasma-pay/core"

**Cause:** Packages not built before Next.js build

**Fix:**
```bash
# Verify build script exists
cat plasma-sdk/package.json | grep vercel-build

# Should see:
# "vercel-build": "npm run build:packages && npm run build:venmo"
```

### Build Fails: "turbo: command not found"

**Cause:** Turbo not installed

**Fix:** Check `plasma-sdk/package.json` has turbo in devDependencies:
```json
{
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

### Runtime Error: "NEXT_PUBLIC_PRIVY_APP_ID is not defined"

**Cause:** Environment variable not set

**Fix:** Add to Vercel dashboard or use CLI:
```bash
vercel env add NEXT_PUBLIC_PRIVY_APP_ID production
```

### Authentication Fails

**Cause:** Privy callback URLs not configured

**Fix:**
1. Go to Privy dashboard
2. Add your Vercel URL to allowed domains
3. Add callback URLs
4. Redeploy

### Database Connection Fails

**Cause:** DATABASE_URL not set or incorrect

**Fix:**
```bash
# Check env var is set
vercel env ls

# If using Vercel Postgres
vercel postgres create

# Pull env vars
vercel env pull
```

### Relayer Out of Funds

**Cause:** Relayer wallet has insufficient USDT0

**Fix:**
1. Check relayer balance on Plasma Network
2. Send more USDT0 to relayer address
3. Monitor balance regularly

---

## Monitoring

### Error Tracking

Add Sentry (optional):
```bash
npm install @sentry/nextjs
```

### Performance Monitoring

Use Vercel Analytics (built-in):
- Go to Project > Analytics
- View Web Vitals
- Monitor performance

### User Analytics

PostHog is already configured if you added the env vars.

---

## Maintenance

### Update Dependencies

```bash
cd plasma-sdk
npm update
git commit -am "chore: update dependencies"
git push
```

### Database Migrations

```bash
# Run migrations
npm run db:migrate

# Or manually
npx drizzle-kit push
```

### Monitor Relayer Balance

Set up alerts when balance drops below threshold.

---

## Rollback

If deployment fails:

```bash
# Via CLI
vercel rollback

# Or via dashboard
# Go to Deployments > Previous deployment > Promote to Production
```

---

## Security Checklist

- [ ] All environment variables set
- [ ] Private keys never committed to git
- [ ] Privy callback URLs configured
- [ ] Database connection secured
- [ ] API endpoints protected
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Error messages don't leak secrets

---

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review this guide
3. Check GitHub issues
4. Contact team on Slack

---

## Quick Reference

**Vercel Dashboard:** https://vercel.com/dashboard  
**Privy Dashboard:** https://dashboard.privy.io  
**PostHog Dashboard:** https://posthog.com  
**Resend Dashboard:** https://resend.com/dashboard  

**Plasma Network:**
- Chain ID: 9745
- RPC: https://rpc.plasma.to
- Explorer: https://explorer.plasma.to

---

## Next Steps

After successful deployment:

1. Set up monitoring and alerts
2. Configure custom domain
3. Add more payment methods
4. Implement additional features
5. Scale infrastructure as needed
