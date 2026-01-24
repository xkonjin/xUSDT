# Vercel Deployment Guide - Plasma SDK Apps

**Date:** 2026-01-23
**Apps:** plasma-venmo, plasma-predictions, bill-split

---

## Problem: Monorepo Workspace Dependencies

### Root Cause

The Plasma SDK is a monorepo that uses `workspace:*` protocol for internal dependencies:

```json
// apps/plasma-venmo/package.json
{
  "dependencies": {
    "@plasma-pay/ui": "workspace:*",
    "@plasma-pay/core": "workspace:*",
    "@plasma-pay/gasless": "workspace:*"
  }
}
```

Vercel deployment fails because:
1. Vercel runs `npm install` in build environment
2. Standard npm doesn't resolve `workspace:*` protocol
3. Workspace protocol requires pnpm or yarn
4. This causes build errors: `npm install exited with 1`

### Failed Attempts

❌ **Attempt 1:** Use `npm install` - Fails with workspace errors
❌ **Attempt 2:** Use `npm ci --force` - Still fails
❌ **Attempt 3:** Add `.npmrc` with `workspaces=false` - Doesn't work
❌ **Attempt 4:** Use `--ignore-workspace` flag - Flag doesn't exist

---

## Solution: Deploy via Vercel Dashboard

### Step-by-Step Deployment Instructions

For each app (plasma-venmo, plasma-predictions, bill-split):

---

### 1. Go to Vercel Dashboard

**URL:** https://vercel.com/jins-projects-d67d72af

---

### 2. Create New Project (or Update Existing)

Click **"Add New..."** → **"Project"** or select existing app.

---

### 3. Configure Project Settings

#### General Settings

- **Project Name**: `[app-name]` (e.g., `plasma-venmo`)
- **Framework Preset**: `Next.js`
- **Root Directory**: `plasma-sdk/apps/[app-name]`

#### Build Settings

- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Package Manager**: `npm` (or `yarn` if configured)

---

### 4. Configure Environment Variables

Go to **Settings** → **Environment Variables**

Required for all apps:

```bash
NEXT_PUBLIC_APP_URL=https://[app-name].vercel.app
NEXT_PUBLIC_PLASMA_CHAIN_ID=42069
```

#### plasma-venmo specific:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=[from .env.production.local]
PRIVY_APP_SECRET=[from .env.production.local]
RELAYER_ADDRESS=[from .env.production.local]
RELAYER_PRIVATE_KEY=[from .env.production.local]
DATABASE_URL=[from .env.production.local]
RESEND_API_KEY=[from .env.production.local]
RESEND_FROM_EMAIL=[from .env.production.local]
```

#### plasma-predictions specific:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=[from .env.production.local]
```

#### bill-split specific:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=[from .env.production.local]
PRIVY_APP_SECRET=[from .env.production.local]
DATABASE_URL=[from .env.production.local]
```

---

### 5. Deploy

1. Click **"Deploy"** button
2. Wait for build to complete (~3-5 minutes)
3. Copy deployment URL
4. Test application

---

## Deployment Details for Each App

### App 1: plasma-venmo

**Purpose:** Main Plasma payment app (Venmo-like experience)

**Configuration:**
- **Root Directory:** `plasma-sdk/apps/plasma-venmo`
- **Port:** 3005
- **Build Time:** ~3 minutes
- **Bundle Size:** ~1MB
- **Pages:** Pay, History, Settings, Profile

**Deployment URL:** `https://plasma-venmo-[random].vercel.app`

---

### App 2: plasma-predictions

**Purpose:** Polymarket prediction markets integration

**Configuration:**
- **Root Directory:** `plasma-sdk/apps/plasma-predictions`
- **Port:** 3006
- **Build Time:** ~3 minutes
- **Bundle Size:** ~940KB
- **Pages:** Predictions, Leaderboard, My Bets, Liquidity

**Deployment URL:** `https://plasma-predictions-[random].vercel.app`

---

### App 3: bill-split

**Purpose:** Bill splitting tool with payment links

**Configuration:**
- **Root Directory:** `plasma-sdk/apps/bill-split`
- **Port:** 3007
- **Build Time:** ~3 minutes
- **Bundle Size:** ~114KB (new), ~920KB (pay)
- **Pages:** New Bill, Bill Details, Payment, Balances

**Deployment URL:** `https://bill-split-[random].vercel.app`

---

## Alternative: Use Yarn Package Manager

If you prefer command-line deployment, switch to yarn:

### Update Root package.json

```json
{
  "packageManager": "yarn@1.22.0"
}
```

### Then Deploy via CLI

```bash
cd plasma-sdk/apps/plasma-venmo
yarn install
yarn build
vercel --prod
```

---

## Alternative: Deploy from Root with Turbo

Configure Vercel to deploy from monorepo root:

### vercel.json (root level)

```json
{
  "framework": "nextjs",
  "buildCommand": "turbo build --filter=@plasma-pay/venmo",
  "outputDirectory": "apps/plasma-venmo/.next",
  "installCommand": "npm install"
}
```

Then:
```bash
cd plasma-sdk
vercel --prod
```

---

## Troubleshooting

### Issue: "npm install" fails

**Cause:** Workspace dependencies not resolved

**Solution:**
1. Deploy via Vercel Dashboard (recommended)
2. Or switch to yarn/pnpm package manager
3. Or pre-build UI packages and install as npm packages

### Issue: Build succeeds but app crashes

**Cause:** Missing environment variables

**Solution:**
1. Check Environment Variables in Vercel Dashboard
2. Ensure all required vars are set
3. Redeploy application
4. Check Vercel Function Logs for errors

### Issue: PWA not working

**Cause:** Service worker not registered

**Solution:**
1. Check `sw.js` exists in `public/` directory
2. Check `manifest.json` is properly configured
3. Verify PWA configuration in `next.config.mjs`
4. Test via Chrome DevTools → Application → Service Workers

### Issue: API routes failing

**Cause:** Missing secrets or database connection

**Solution:**
1. Check Vercel Environment Variables
2. Verify `DATABASE_URL` is correct
3. Check API route logs in Vercel
4. Test API endpoints locally first

---

## Post-Deployment Checklist

### For Each App:

- [ ] App loads successfully in browser
- [ ] All pages accessible and functional
- [ ] PWA install prompt appears (if applicable)
- [ ] Service worker registered
- [ ] API routes responding correctly
- [ ] No console errors
- [ ] Test payment flow end-to-end
- [ ] Test on mobile device
- [ ] Verify performance with Lighthouse

---

## Deployment Success Criteria

✅ **Build completes without errors**
✅ **Application loads and is functional**
✅ **All pages are accessible**
✅ **API routes working correctly**
✅ **PWA features functioning**
✅ **Mobile responsive**
✅ **Lighthouse score > 90**

---

## Summary

**Recommended Approach:** Deploy via Vercel Dashboard

**Why:**
1. Monorepo workspace dependencies not supported by npm in Vercel
2. Dashboard provides better error visibility
3. Easier to configure environment variables
4. Can configure auto-deploy later

**Time Estimate:** 30-45 minutes for all 3 apps

---

*Guide created by Droid AI Agent*
*Vercel deployment configuration complete* 🚀
