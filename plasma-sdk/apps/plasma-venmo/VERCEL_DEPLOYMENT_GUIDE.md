# Plenmo Vercel Deployment Guide
**Complete Setup for Error-Free Deployment**

---

## Overview

This guide provides complete instructions for deploying Plenmo to Vercel with all configurations, environment variables, and setup steps.

**App:** Plenmo (plasma-venmo)
**Framework:** Next.js 14
**Repository:** https://github.com/xkonjin/xUSDT.git

---

## Pre-Deployment Checklist

### ✅ Requirements Met

- [x] Security vulnerabilities fixed
- [x] Error boundaries implemented
- [x] Redis rate limiting code ready
- [x] Mock mode removed from production
- [x] Vercel configuration updated
- [x] Redis package installed (@upstash/redis)
- [x] Build configuration fixed

---

## Step 1: Vercel Project Setup

### 1.1 Create Vercel Project (if not exists)

**Via Vercel Dashboard:**
1. Go to https://vercel.com/new
2. Import: `https://github.com/xkonjin/xUSDT.git`
3. Project name: `plasma-venmo`
4. Framework preset: `Next.js`
5. Root directory: `plasma-sdk/apps/plasma-venmo`
6. Click: Deploy

**Via CLI:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Create project
cd plasma-sdk/apps/plasma-venmo
vercel link
```

---

### 1.2 Update Vercel Project Settings

**Go to:** https://vercel.com/jins-projects-d67d72af/plasma-venmo/settings

**General Settings:**
- Project Name: `plasma-venmo`
- Framework Preset: `Next.js`
- Root Directory: `plasma-sdk/apps/plasma-venmo`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Build & Development Settings:**
- Node.js Version: `18.x` or higher
- Framework: `Next.js`

**Git Configuration:**
- Production Branch: `main`
- Automatic Deployments: `true`

---

## Step 2: Environment Variables

### 2.1 Add Environment Variables

**Go to:** https://vercel.com/jins-projects-d67d72af/plasma-venmo/settings/environment-variables

Add the following environment variables:

### Authentication (Required)
```bash
NEXT_PUBLIC_PRIVY_APP_ID=cmk5utj4502e0js0cdsgfanao
PRIVY_APP_SECRET=privy_app_secret_3Fi6yrkbdRxP2oPBiFRdaJWRcRprGusCo8AjuGT5kZAPSJMeUTbEaggYGRHtwirg7jNyvaWiKiSLTvU4gx8X9WUr
```

### Database (Required)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```
Use Neon DB, Vercel Postgres, or Supabase.

### Relayer / Gas Sponsorship (Required)
```bash
RELAYER_ADDRESS=0xdEc34d821a100ae7a632cAF36161C5651D0d5dF9
RELAYER_PRIVATE_KEY=0xf1ed152903164a1a49c97c806f4e62af994e0549f5bb7b4033b483d447a32b84
```

### Merchant / Escrow (Required)
```bash
MERCHANT_ADDRESS=0x03BD07c84B6D9682E238ec865B34bECFE045d09A
```

### Email (Required)
```bash
RESEND_API_KEY=re_WJiGdLJy_MQe8F3kge3YxGpiw4eQc81qb
RESEND_FROM_EMAIL="Plenmo <onboarding@resend.dev>"
```

### App Configuration (Required)
```bash
NEXT_PUBLIC_APP_URL=https://plenmo.vercel.app
NEXT_PUBLIC_PLASMA_CHAIN_ID=9745
NEXT_PUBLIC_PLASMA_RPC=https://rpc.plasma.to
```

### Redis Rate Limiting (Optional but Recommended)
```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```
See Step 3 for setup.

### Analytics (Optional)
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

### 2.2 Environment Variable Notes

**CRITICAL:** Do NOT add `NEXT_PUBLIC_` prefix to sensitive variables!

❌ **WRONG:**
```bash
NEXT_PUBLIC_RELAYER_PRIVATE_KEY=0x...
NEXT_PUBLIC_API_AUTH_SECRET=...
```

✅ **CORRECT:**
```bash
RELAYER_PRIVATE_KEY=0x...
API_AUTH_SECRET=...
```

**Reason:** Variables with `NEXT_PUBLIC_` prefix are exposed to client-side JavaScript, making them visible in browser DevTools.

---

## Step 3: Redis Rate Limiting Setup

### 3.1 Create Upstash Redis Database

**Option A: Via Vercel Dashboard (Recommended)**
1. Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/storage
2. Click: Create Database
3. Select: Redis (Upstash)
4. Database Name: `plenmo-redis`
5. Region: US East (or closest to users)
6. Click: Create

**Option B: Via Upstash Dashboard**
1. Go to: https://upstash.com/dashboard
2. Click: Create Database
3. Choose: Global
4. Database Name: `plenmo-redis`
5. Region: Global (Multi-Region)
6. Click: Create

**Option C: Via CLI**
```bash
# Install Upstash CLI
npm install -g @upstash/cli

# Login
upstash login

# Create database
upstash redis create plenmo-redis
```

### 3.2 Add Redis Environment Variables

After creating the database, Upstash will provide the following:

**Add to Vercel Environment Variables:**
```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### 3.3 Verify Redis Setup

```bash
# Test Redis connection
npm run dev

# Check logs for Redis errors
# Should see: "[rate-limiter-redis] Redis not configured, allowing request"
# Then after adding vars: Redis should work
```

---

## Step 4: Vercel Configuration

### 4.1 vercel.json

The `vercel.json` file has been updated with:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://plenmo.vercel.app",
    "NEXT_PUBLIC_PLASMA_CHAIN_ID": "9745",
    "NEXT_PUBLIC_PLASMA_RPC": "https://rpc.plasma.to",
    "NODE_ENV": "production"
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

**Key Changes:**
- Removed `--ignore-workspace` flag
- Added function timeouts (30s)
- Added default environment variables

### 4.2 next.config.mjs

The `next.config.mjs` file includes:
- Transpilation of monorepo packages
- PWA configuration
- Security headers
- Performance optimizations

### 4.3 .vercelignore

The `.vercelignore` file excludes:
- Dependencies
- Tests
- Build artifacts
- Documentation
- IDE files

---

## Step 5: Deploy to Vercel

### 5.1 Deploy from Main Branch

**Option A: Via Vercel Dashboard**
1. Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/deployments
2. Click: Deployments tab
3. Click: New Deployment
4. Select branch: `main`
5. Click: Deploy

**Option B: Via CLI**
```bash
cd plasma-sdk/apps/plasma-venmo
vercel --prod
```

**Option C: Via Git Push**
```bash
# Push to main branch
git push origin main

# Vercel will auto-deploy
# Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/deployments
# Monitor deployment status
```

### 5.2 Monitor Deployment

**Deployment Logs:**
1. Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/deployments
2. Click on latest deployment
3. Monitor build logs
4. Check for errors

**Expected Build Time:** 2-5 minutes

**Success Indicators:**
- ✅ "Build completed"
- ✅ "Deployment succeeded"
- ✅ "Production URL: https://plenmo.vercel.app"

---

## Step 6: Smoke Tests

### 6.1 Test Application

**Access App:** https://plenmo.vercel.app

**Tests:**
1. ✅ Page loads without errors
2. ✅ Authentication works (login)
3. ✅ Balance displays
4. ✅ Send money form opens
5. ✅ Request money form opens
6. ✅ Contact list loads
7. ✅ Transaction history shows
8. ✅ No console errors (check DevTools)

### 6.2 Test API Routes

```bash
# Test health endpoint (if exists)
curl https://plenmo.vercel.app/api/health

# Test rate limiting
for i in {1..15}; do
  curl -X POST https://plenmo.vercel.app/api/submit-transfer \
    -H "Content-Type: application/json" \
    -d '{"test":"data"}'
  echo "Request $i"
done
# Should hit rate limit after 10 requests
```

### 6.3 Test Error Boundaries

**Simulate Error:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `throw new Error("Test error")`
4. Verify error boundary displays
5. Check for "Try Again" and "Go Home" buttons

---

## Step 7: Production Verification

### 7.1 Check Environment Variables

**Via CLI:**
```bash
# Pull environment variables
vercel env pull .env.local

# Verify sensitive variables are NOT exposed
grep NEXT_PUBLIC_ .env.local
# Should NOT see: RELAYER_PRIVATE_KEY, API_AUTH_SECRET, etc.
```

**Via Dashboard:**
1. Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/settings/environment-variables
2. Review all variables
3. Ensure sensitive vars don't have `NEXT_PUBLIC_` prefix

### 7.2 Verify Redis Rate Limiting

**Check Vercel Functions:**
1. Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/functions
2. Monitor function logs
3. Look for Redis errors
4. Should see successful rate limiting logs

**Check Upstash Dashboard:**
1. Go to: https://upstash.com/dashboard
2. Select: `plenmo-redis`
3. Monitor: Keys
4. Should see `ratelimit:*` keys

### 7.3 Verify Mock Mode Disabled

**Check Production Logs:**
1. Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/deployments
2. Click on latest production deployment
3. Monitor function logs
4. Should NOT see: "Mock mode enabled"
5. Should see: "Production mode" or no mock mode logs

---

## Step 8: Monitoring Setup

### 8.1 Vercel Analytics

**Enable:**
1. Go to: https://vercel.com/jins-projects-d67d72af/plasma-venmo/analytics
2. Click: Enable Analytics
3. Monitor:
   - Page views
   - Core Web Vitals
   - Performance metrics

### 8.2 Error Tracking (Sentry)

**Setup (if not done):**
```bash
# Install Sentry
npm install @sentry/nextjs

# Add to Vercel environment variables
SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=...
```

**Integration:**
- See: https://docs.sentry.io/platforms/javascript/guides/nextjs/

### 8.3 User Analytics (PostHog)

**Setup (if not done):**
```bash
# Add to Vercel environment variables
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Integration:**
- Already configured in `src/lib/posthog.ts`
- Monitor events in: https://app.posthog.com/

---

## Troubleshooting

### Build Errors

**"npm install exited with 1"**
- Cause: Monorepo dependencies issue
- Fix: Ensure `transpilePackages` in `next.config.mjs`
- Fix: Check `installCommand` in `vercel.json` (should be `npm install`)

**"Module not found"**
- Cause: Missing dependency
- Fix: Check `package.json`
- Fix: Run: `npm install`

**"Cannot resolve @plasma-pay/..."**
- Cause: Monorepo package not transpiled
- Fix: Ensure package is in `transpilePackages` in `next.config.mjs`

### Runtime Errors

**"Payment service configuration error"**
- Cause: `RELAYER_PRIVATE_KEY` not set or invalid
- Fix: Add valid `RELAYER_PRIVATE_KEY` to Vercel env vars
- Fix: Check logs for validation errors

**"Redis connection failed"**
- Cause: Redis not configured or unreachable
- Fix: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Fix: Verify Redis database exists
- Fix: Check network connectivity

**"Rate limit exceeded"**
- Cause: Too many requests
- Fix: Wait for rate limit to reset
- Fix: Increase rate limits in `RATE_LIMIT_CONFIGS`
- Fix: Check for DoS attacks

**"Mock mode enabled in production"**
- Cause: `NEXT_PUBLIC_MOCK_AUTH` set to `true`
- Fix: Remove `NEXT_PUBLIC_MOCK_AUTH` env var
- Fix: Ensure `NODE_ENV=production`

### Performance Issues

**"Slow page loads"**
- Cause: Large bundle size
- Fix: Run: `ANALYZE=true npm run build`
- Fix: Optimize code splitting
- Fix: Use dynamic imports

**"High latency on API routes"**
- Cause: Slow database queries
- Fix: Add database indexes
- Fix: Use Redis caching
- Fix: Optimize queries

---

## Post-Deployment Tasks

### 1. Monitor for 24 Hours
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Watch for unusual activity
- [ ] Test user flows

### 2. Run End-to-End Tests
- [ ] Payment flow (send)
- [ ] Payment flow (request)
- [ ] Claim flow
- [ ] Contact management
- [ ] Transaction history

### 3. Gather User Feedback
- [ ] Deploy to beta users
- [ ] Collect feedback
- [ ] Address issues
- [ ] Iterate on features

### 4. Setup Alerts
- [ ] Configure Vercel alerts (errors, deployment failures)
- [ ] Configure Sentry alerts (error rates)
- [ ] Configure Slack/Discord notifications
- [ ] Setup on-call rotation

---

## Summary

### What Was Configured

1. ✅ Vercel project settings updated
2. ✅ `vercel.json` configured
3. ✅ `next.config.mjs` configured
4. ✅ `.vercelignore` configured
5. ✅ Environment variables documented
6. ✅ Redis rate limiting setup guide
7. ✅ Deployment instructions created
8. ✅ Troubleshooting guide created

### Deployment Readiness

**Status:** ✅ READY FOR DEPLOYMENT

**Prerequisites:**
- [x] Security fixes applied
- [x] Error boundaries implemented
- [x] Redis rate limiting code ready
- [x] Vercel configuration fixed
- [x] Environment variables documented
- [ ] Redis database created (optional but recommended)

**Time to Deploy:** 30-60 minutes

---

## Next Steps

1. **Create Upstash Redis database** (5 minutes)
2. **Add environment variables to Vercel** (15 minutes)
3. **Deploy to Vercel** (10 minutes)
4. **Run smoke tests** (15 minutes)
5. **Monitor for 24 hours** (1 day)
6. **Gather feedback and iterate** (1 week)

---

*Vercel Deployment Guide Complete*
*Ready for Production Deployment* ✅
