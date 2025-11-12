# Quick Deployment Guide

## Step 1: Login to Vercel

```bash
cd v0
vercel login
```

This will open your browser to authenticate with Vercel.

## Step 2: Deploy

```bash
# From project root
./scripts/deploy.sh

# Or manually:
cd v0
vercel --prod
```

## Step 3: Set Environment Variables

After deployment, go to Vercel Dashboard → Your Project → Settings → Environment Variables and add:

### Required Variables:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://... (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
CRON_SECRET=your-random-secret-here
PLASMA_RPC=https://rpc.plasma.to
PLASMA_CHAIN_ID=9745
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
```

### Optional Variables:

```env
TOY_NFT_CONTRACT_ADDRESS=0x...
MERCHANT_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
CLIENT_PRIVATE_KEY=0x...
GAME_API_URL=http://127.0.0.1:8001
MERCHANT_URL=http://127.0.0.1:8000
```

## Step 4: Initialize Database

After deployment, you'll need to:

1. **Run database migrations** - Connect to your database and run:
   ```bash
   # Set DATABASE_URL
   export DATABASE_URL=your-postgres-url
   
   # Run migrations (if you have Alembic set up)
   cd agent/migrations
   alembic upgrade head
   ```

2. **Seed toy catalog** - Run the seed script or manually insert toy data

3. **Generate daily bonuses** - The cron job will handle this, or you can trigger manually

## Step 5: Verify Deployment

Visit your Vercel URL and check:
- `/api/game/toys` - Should return toy catalog
- `/store` - Toy store page
- `/play` - Game selection page
- `/leaderboard` - Leaderboard page

## Troubleshooting

### Build Fails
- Check all dependencies are in `package.json`
- Verify TypeScript compiles: `npm run build`
- Check for missing environment variables

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Ensure SSL is enabled if required

### Cron Jobs Not Running
- Verify `CRON_SECRET` is set
- Check cron endpoints return 200 status
- View logs in Vercel Dashboard

## Quick Deploy Command

```bash
cd v0 && vercel --prod --yes
```

This will deploy immediately if you're already logged in.

