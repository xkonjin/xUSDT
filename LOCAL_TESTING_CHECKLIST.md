# xUSDT Local Testing Checklist

## Current Status
- [x] Merchant Service running on port 8000
- [x] Wallets funded on Plasma (Client: 0.47 USDT0, Relayer: 0.19 USDT0, Merchant: 0.20 USDT0)
- [x] v0 Demo app works
- [ ] Smart contracts not deployed
- [ ] Privy not configured
- [ ] Database not set up

---

## PHASE 1: Smart Contract Deployment (Optional for basic testing)

The contracts enable on-chain payment routing with fees. For basic EIP-3009 testing, you can skip this and use direct transfers.

### To Deploy (when ready):

```bash
cd /Users/a002/DEV/xUSDT

# Set fee collector (use your merchant address)
export FEE_COLLECTOR=0x03BD07c84B6D9682E238ec865B34bECFE045d09A
export PLATFORM_FEE_BPS=10
export CHANNEL_TOKEN=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb

# Deploy PlasmaPaymentRouter
npx hardhat run scripts/deploy_router.js --network plasma

# Deploy PlasmaPaymentChannel  
npx hardhat run scripts/deploy_channel.js --network plasma

# After deployment, add to .env:
# ROUTER_ADDRESS=0x...deployed_router_address
# CHANNEL_ADDRESS=0x...deployed_channel_address
```

**Cost estimate:** ~0.01-0.05 native token per contract (you have 0.50 in relayer)

---

## PHASE 2: Privy Authentication Setup

Privy is required for all plasma-sdk apps (wallet connection, login).

### Steps:

1. **Go to:** https://privy.io
2. **Sign up** for free account
3. **Create new app** called "Plasma Pay Local"
4. **Get credentials:**
   - App ID (looks like: `clxxxxxxxxxxxxxxxxxx`)
   - App Secret (looks like: `privy-app-secret-xxxx`)
5. **Configure allowed origins** in Privy dashboard:
   - `http://localhost:3000`
   - `http://localhost:3002`
   - `http://localhost:3003`
   - `http://localhost:3004`

### Add to your .env:
```bash
# Add these lines to /Users/a002/DEV/xUSDT/.env
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id-here
PRIVY_APP_SECRET=your-app-secret-here
```

---

## PHASE 3: Database Setup (SQLite for Local)

For local testing, SQLite works fine. No external setup needed.

### Initialize the database:
```bash
cd /Users/a002/DEV/xUSDT/plasma-sdk/packages/db

# Generate Prisma client
npx prisma generate

# Create SQLite database with tables
npx prisma db push
```

This creates `plasma-pay.db` in the db package.

---

## PHASE 4: Create .env.local Files for Apps

Each app needs its own `.env.local`. Here's what to create:

### plasma-venmo (port 3002)
```bash
cat > /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo/.env.local << 'EOF'
DATABASE_URL="file:../../packages/db/prisma/plasma-pay.db"
RELAYER_PRIVATE_KEY="YOUR_RELAYER_KEY_FROM_MAIN_ENV"
MERCHANT_ADDRESS="0x03BD07c84B6D9682E238ec865B34bECFE045d09A"
NEXT_PUBLIC_PRIVY_APP_ID="YOUR_PRIVY_APP_ID"
PRIVY_APP_SECRET="YOUR_PRIVY_SECRET"
PLASMA_RPC="https://rpc.plasma.to"
USDT0_ADDRESS="0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb"
NEXT_PUBLIC_APP_URL="http://localhost:3002"
EOF
```

### bill-split (port 3003)
```bash
cat > /Users/a002/DEV/xUSDT/plasma-sdk/apps/bill-split/.env.local << 'EOF'
DATABASE_URL="file:../../packages/db/prisma/plasma-pay.db"
RELAYER_PRIVATE_KEY="YOUR_RELAYER_KEY_FROM_MAIN_ENV"
NEXT_PUBLIC_PRIVY_APP_ID="YOUR_PRIVY_APP_ID"
PRIVY_APP_SECRET="YOUR_PRIVY_SECRET"
OPENAI_API_KEY="YOUR_OPENAI_KEY_FROM_MAIN_ENV"
NEXT_PUBLIC_APP_URL="http://localhost:3003"
NEXT_PUBLIC_PLASMA_VENMO_URL="http://localhost:3002"
EOF
```

### telegram-webapp (port 3005)
```bash
cat > /Users/a002/DEV/xUSDT/plasma-sdk/apps/telegram-webapp/.env.local << 'EOF'
NEXT_PUBLIC_API_URL="http://localhost:3002"
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_FROM_MAIN_ENV"
NEXT_PUBLIC_BOT_USERNAME="Billsplitz_bot"
EOF
```

### plasma-stream (port 3007)
```bash
cat > /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-stream/.env.local << 'EOF'
NEXT_PUBLIC_PRIVY_APP_ID="YOUR_PRIVY_APP_ID"
PRIVY_APP_SECRET="YOUR_PRIVY_SECRET"
DATABASE_URL="file:../../packages/db/prisma/plasma-pay.db"
RELAYER_PRIVATE_KEY="YOUR_RELAYER_KEY_FROM_MAIN_ENV"
RELAYER_ADDRESS="0xdEc34d821a100ae7a632cAF36161C5651D0d5dF9"
MERCHANT_ADDRESS="0x03BD07c84B6D9682E238ec865B34bECFE045d09A"
NEXT_PUBLIC_APP_URL="http://localhost:3007"
EOF
```

---

## PHASE 5: Start Everything

### Terminal 1 - Merchant Service (Python)
```bash
cd /Users/a002/DEV/xUSDT
export PYTHONPATH=.
source .env
uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 - All SDK Apps (runs all Next.js apps)
```bash
cd /Users/a002/DEV/xUSDT/plasma-sdk
npm run dev
```

### Terminal 3 - v0 Demo (separate from SDK)
```bash
cd /Users/a002/DEV/xUSDT/v0
npm run dev
```

---

## App URLs (after starting)

| App | URL | Purpose |
|-----|-----|---------|
| Merchant API | http://localhost:8000 | Payment backend |
| Merchant Docs | http://localhost:8000/docs | Swagger UI |
| v0 Demo | http://localhost:3000 | Test EIP-3009 payments |
| plasma-venmo | http://localhost:3002 | Venmo-style P2P |
| bill-split | http://localhost:3003 | Bill splitting |
| plasma-predictions | http://localhost:3004 | Prediction markets |
| telegram-webapp | http://localhost:3005 | Telegram mini-app |
| subkiller | http://localhost:3006 | Subscription killer |
| plasma-stream | http://localhost:3007 | Streaming payments |

---

## Quick Test Flow

1. **Test merchant health:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Test 402 payment flow:**
   ```bash
   curl http://localhost:8000/premium
   # Should return 402 with payment details
   ```

3. **Open v0 demo:**
   - Go to http://localhost:3000
   - Click "Merchant" to see config
   - Click "Client" to test payment flow

---

## What's NOT Needed for Local Testing

- [ ] ~~Resend API~~ - Email notifications (nice to have)
- [ ] ~~PostHog~~ - Analytics (nice to have)
- [ ] ~~Plasma Gasless API~~ - You're paying gas yourself locally
- [ ] ~~Production database~~ - SQLite is fine locally

---

## Troubleshooting

### "Privy app ID not found"
- You need to set up Privy (Phase 2) for any plasma-sdk app

### "Database error"
- Run `cd plasma-sdk/packages/db && npx prisma db push`

### "RELAYER_PRIVATE_KEY not found"
- Copy from your main .env to each app's .env.local

### Port already in use
- Kill existing process: `lsof -ti:3000 | xargs kill`
