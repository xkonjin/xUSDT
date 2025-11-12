# Trillionaire Toy Store - Vercel Deployment Guide

This guide covers deploying the Trillionaire Toy Store game to Vercel.

## Prerequisites

1. Vercel account
2. Vercel Postgres database (or external PostgreSQL)
3. Upstash Redis instance (or external Redis)
4. Environment variables configured

## Step 1: Set Up Database

### Option A: Vercel Postgres (Recommended)

1. Go to Vercel Dashboard → Your Project → Storage
2. Create a new Postgres database
3. Copy the `POSTGRES_URL` connection string

### Option B: External PostgreSQL

Use any PostgreSQL provider (Supabase, Neon, Railway, etc.) and get the connection URL.

## Step 2: Set Up Redis

### Option A: Upstash Redis (Recommended)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### Option B: External Redis

Use any Redis provider and get the connection URL.

## Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

```env
# Database
DATABASE_URL=postgresql://...
# Or use GAME_DATABASE_URL if different name

# Redis
REDIS_URL=redis://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Blockchain
PLASMA_RPC=https://rpc.plasma.to
PLASMA_CHAIN_ID=9745
USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
TOY_NFT_CONTRACT_ADDRESS=0x... # Your NFT contract address

# Merchant
MERCHANT_ADDRESS=0x...
RELAYER_PRIVATE_KEY=0x...
CLIENT_PRIVATE_KEY=0x...

# Cron Jobs (for weekly prizes and daily bonuses)
CRON_SECRET=your-random-secret-string

# Optional: Game API URL (if keeping FastAPI service separate)
GAME_API_URL=http://127.0.0.1:8001
MERCHANT_URL=http://127.0.0.1:8000
```

## Step 4: Initialize Database

Before deploying, run database migrations:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Set DATABASE_URL environment variable
export DATABASE_URL=your-postgres-url

# Run migrations
cd agent/migrations
alembic upgrade head

# Or use the init script
python scripts/init_db.py
```

Alternatively, you can run migrations after deployment using Vercel's CLI or a one-time script.

## Step 5: Deploy to Vercel

### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Option B: GitHub Integration

1. Push your code to GitHub
2. Import project in Vercel Dashboard
3. Connect your GitHub repository
4. Vercel will auto-deploy on push

## Step 6: Configure Cron Jobs

Vercel cron jobs are configured in `vercel.json`:

- **Daily Bonuses**: Runs daily at midnight UTC (`0 0 * * *`)
- **Weekly Prizes**: Runs Fridays at midnight UTC (`0 0 * * 5`)

Make sure `CRON_SECRET` is set in environment variables. The cron endpoints will verify this secret.

## Step 7: Verify Deployment

1. Check health endpoint: `https://your-app.vercel.app/api/game/health`
2. Test toy store: `https://your-app.vercel.app/store`
3. Test game play: `https://your-app.vercel.app/play`
4. Check leaderboard: `https://your-app.vercel.app/leaderboard`

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Ensure SSL is enabled if required

### Redis Connection Issues

- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check Upstash dashboard for connection status

### Cron Jobs Not Running

- Verify `CRON_SECRET` is set
- Check Vercel cron logs in dashboard
- Ensure cron endpoints return 200 status

### Build Failures

- Check `v0/package.json` has all dependencies
- Verify TypeScript compilation passes
- Check for missing environment variables

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Toy catalog seeded
- [ ] Daily bonuses generated for today
- [ ] Wallet connection works
- [ ] Toy purchase flow works
- [ ] Games are playable
- [ ] Leaderboard updates correctly
- [ ] Cron jobs are scheduled

## Monitoring

- Use Vercel Analytics for performance monitoring
- Check Vercel Logs for errors
- Monitor database and Redis usage
- Set up alerts for cron job failures

## Scaling Considerations

- Database connection pooling is configured for serverless
- Redis caching reduces database load
- Consider adding CDN for static assets
- Monitor API route execution times (max 30s on Vercel)

## Support

For issues or questions:
- Check Vercel documentation: https://vercel.com/docs
- Review game logs in Vercel dashboard
- Check database and Redis provider dashboards
