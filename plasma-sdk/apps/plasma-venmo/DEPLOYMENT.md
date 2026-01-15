# Plenmo Deployment Guide

## Prerequisites

1. Vercel account
2. Privy account with app configured
3. PostgreSQL database (Vercel Postgres, Supabase, or Neon)

## Step 1: Set up PostgreSQL Database

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Create a new Postgres database
3. Copy the `DATABASE_URL` connection string

### Option B: Supabase (Free tier available)
1. Create a Supabase project at https://supabase.com
2. Go to Settings → Database → Connection string
3. Copy the connection string (use "Transaction" mode for serverless)

### Option C: Neon (Free tier available)
1. Create a Neon project at https://neon.tech
2. Copy the connection string

## Step 2: Configure Privy

1. Go to https://dashboard.privy.io
2. Select your app
3. Add allowed origins:
   - `https://plenmo.vercel.app`
   - `http://localhost:3005` (for local dev)
4. Configure Plasma chain (ID: 9745, RPC: https://rpc.plasma.to)
5. Enable gas sponsorship if desired

## Step 3: Deploy to Vercel

### Via Vercel CLI
```bash
cd apps/plasma-venmo
vercel --prod
```

### Via GitHub Integration
1. Push to GitHub
2. Import in Vercel dashboard
3. Set root directory to `apps/plasma-venmo`

## Step 4: Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

### Required
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
DATABASE_URL=postgresql://...
```

### Wallet Configuration
```
RELAYER_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
MERCHANT_ADDRESS=0x...
NEXT_PUBLIC_MERCHANT_ADDRESS=0x...
```

### API & Services
```
API_AUTH_SECRET=generate_random_string
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Plenmo <noreply@yourdomain.com>
```

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://plenmo.vercel.app
NEXT_PUBLIC_PLASMA_CHAIN_ID=9745
NEXT_PUBLIC_PLASMA_RPC=https://rpc.plasma.to
```

### Optional
```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_TRANSAK_API_KEY=your_transak_api_key
NEXT_PUBLIC_TRANSAK_ENV=STAGING  # or PRODUCTION
```

## Step 6: Configure Transak (Fiat On-Ramp)

Transak allows users to buy USDT0 with credit/debit cards, Apple Pay, and Google Pay.

### Getting a Transak API Key

1. **Sign up** at https://transak.com/dashboard
2. **Create an app** in the Transak dashboard
3. **Configure your app**:
   - App Name: "Plenmo"
   - Website URL: https://plenmo.vercel.app
   - Redirect URL: https://plenmo.vercel.app
   - Supported Crypto: USDT
   - Supported Networks: Plasma
4. **Get your API key** from the dashboard
5. **Set environment variables** in Vercel:
   ```
   NEXT_PUBLIC_TRANSAK_API_KEY=your_transak_api_key
   NEXT_PUBLIC_TRANSAK_ENV=STAGING
   ```

### Transak Environments

- **STAGING**: For testing. Uses test cards. No real money.
- **PRODUCTION**: For live app. Real transactions.

### Testing Transak

In STAGING mode, use these test cards:
- **Success**: 4242 4242 4242 4242
- **3D Secure**: 4000 0025 0000 3155
- **Decline**: 4000 0000 0000 0002

### Without Transak

If Transak is not configured, users can still fund their wallet by:
1. Copying their wallet address
2. Scanning the QR code
3. Transferring USDT0 from another wallet on Plasma Chain

## Step 5: Run Database Migrations

After deploying, run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

Or via Vercel:
```bash
vercel env pull .env.local
npx prisma db push
```

## Troubleshooting

### "Origin not allowed" error
Add your Vercel URL to Privy's allowed origins.

### Database connection errors
- Check DATABASE_URL is correct
- For Supabase, use "Transaction" pooler mode
- Ensure IP allowlist includes Vercel's IPs (or allow all)

### Build errors
- Ensure all environment variables are set
- Check that DATABASE_URL is accessible during build
