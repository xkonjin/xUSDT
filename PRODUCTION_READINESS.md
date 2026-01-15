# xUSDT Production Readiness Report

## Current Status: 🟡 DEVELOPMENT READY, PRODUCTION NEEDS SETUP

Generated: 2026-01-12

---

## 1. SMART CONTRACTS - 🔴 NOT DEPLOYED

### Required Deployments
| Contract | Status | Action Required |
|----------|--------|-----------------|
| PaymentRouter | ❌ Not deployed | Deploy to Plasma mainnet |
| PlasmaPaymentRouter | ❌ Not deployed | Deploy with fee collector |
| PlasmaPaymentChannel | ❌ Not deployed | Deploy for batch settlements |

### Deployment Commands
```bash
# Deploy to Plasma mainnet
npx hardhat run deploy/deploy.js --network plasma

# After deployment, update .env:
ROUTER_ADDRESS=0x...
CHANNEL_ADDRESS=0x...
PLASMA_FEE_COLLECTOR=0x...
```

---

## 2. AUTHENTICATION - 🔴 PRIVY NOT CONFIGURED

### Required Setup
All plasma-sdk apps require Privy.io authentication.

1. Create account at https://privy.io
2. Create a new app
3. Get App ID and App Secret
4. Update environment variables:

```bash
# Add to .env and each app's .env.local
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret

# For JWT verification (predictions API)
PRIVY_VERIFICATION_KEY=your-es256-public-key
```

---

## 3. DATABASE - 🔴 NOT CONFIGURED

### Current State
- Using SQLite for development
- Need PostgreSQL for production

### Setup Required
```bash
# Option 1: Neon (serverless PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Option 2: Supabase
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"

# Option 3: Railway
DATABASE_URL="postgresql://postgres:pass@xxx.railway.app:5432/railway"

# Then run migrations
cd plasma-sdk/packages/db
npx prisma migrate deploy
```

---

## 4. EXTERNAL APIs - 🟡 PARTIALLY CONFIGURED

| Service | Status | Purpose | Action |
|---------|--------|---------|--------|
| Plasma RPC | ✅ Set | Blockchain access | - |
| OpenAI API | ✅ Set | Receipt OCR | - |
| Telegram Bot | ✅ Set | Telegram integration | - |
| Resend API | ❌ Missing | Email notifications | Sign up at resend.com |
| PostHog | ❌ Missing | Analytics | Optional |
| Plasma Gasless | ❌ Missing | Free transactions | Contact Plasma team |

### Plasma Gasless API
For FREE gasless transactions, contact Plasma team for:
```bash
PLASMA_RELAYER_SECRET=your-secret
PLASMA_RELAYER_URL=https://api.plasma.to
```

---

## 5. APPS STATUS

### Merchant Service (Python/FastAPI)
- **Status**: ✅ Running on port 8000
- **URL**: http://127.0.0.1:8000
- **Docs**: http://127.0.0.1:8000/docs

### Plasma SDK Apps

| App | Port | Status | Missing |
|-----|------|--------|---------|
| v0 (Demo UI) | 3000 | 🔴 Not running | Privy config |
| plasma-venmo | 3002 | 🔴 Not running | Privy, Database |
| bill-split | 3003 | 🔴 Not running | Privy, Database |
| plasma-predictions | 3004 | 🔴 Not running | Privy |
| telegram-webapp | 3005 | 🔴 Not running | - |
| subkiller | 3006 | 🔴 Not running | Privy |
| plasma-stream | 3007 | 🔴 Not running | Privy |

---

## 6. QUICK START COMMANDS

### Start Merchant Service
```bash
cd /Users/a002/DEV/xUSDT
export PYTHONPATH=.
source .env
uvicorn agent.merchant_service:app --host 127.0.0.1 --port 8000 --reload
```

### Start All SDK Apps (Development)
```bash
cd /Users/a002/DEV/xUSDT/plasma-sdk
npm run dev
```

### Start Individual App
```bash
cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo
npm run dev
```

---

## 7. PRODUCTION DEPLOYMENT CHECKLIST

### Infrastructure
- [ ] PostgreSQL database provisioned
- [ ] Domain names configured
- [ ] SSL certificates
- [ ] Environment variables set in deployment platform

### Smart Contracts
- [ ] PaymentRouter deployed to Plasma
- [ ] PlasmaPaymentRouter deployed
- [ ] PlasmaPaymentChannel deployed
- [ ] Fee collector address set
- [ ] Contracts verified on explorer

### Authentication
- [ ] Privy app created and configured
- [ ] Allowed origins set in Privy dashboard
- [ ] Wallet connectors enabled

### Services
- [ ] Resend API key for email
- [ ] PostHog for analytics (optional)
- [ ] Error tracking (Sentry) configured

### Security
- [ ] CORS_ORIGINS set to production domains
- [ ] Rate limiting tested
- [ ] Private keys secured (use secrets manager)
- [ ] DEV_MODE=false in production

---

## 8. WALLET ADDRESSES (From .env)

| Role | Address | Funded? |
|------|---------|---------|
| Client | 0xa7C542386ddA8A4edD9392AB487ede0507bDD281 | ❓ Check |
| Relayer | 0xdEc34d821a100ae7a632cAF36161C5651D0d5dF9 | ❓ Check |
| Merchant | 0x03BD07c84B6D9682E238ec865B34bECFE045d09A | ❓ Check |

### Check Balances
```bash
# Check USDT0 balance on Plasma
curl "https://rpc.plasma.to" -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_call","params":[{"to":"0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb","data":"0x70a08231000000000000000000000000YOUR_ADDRESS_HERE"},"latest"],"id":1}'
```

---

## 9. IMMEDIATE ACTION ITEMS

### Priority 1 - Blocking
1. Deploy smart contracts to Plasma mainnet
2. Configure Privy.io authentication
3. Set up PostgreSQL database

### Priority 2 - Important
4. Configure Resend for email notifications
5. Fund relayer wallet with native gas token
6. Set up proper CORS for production domains

### Priority 3 - Nice to Have
7. Configure PostHog analytics
8. Set up error tracking (Sentry)
9. Configure Plasma gasless API for free transactions

---

## 10. TESTING E2E

Once configured, test the full flow:

1. **Merchant Service**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/premium  # Should return 402
   ```

2. **Web App**
   - Open http://localhost:3000
   - Connect wallet via Privy
   - Try to make a payment

3. **Payment Flow**
   - Request invoice (402 PaymentRequired)
   - Sign EIP-3009 authorization
   - Submit to /pay endpoint
   - Verify transaction on Plasma explorer

---

## Need Help?

- **Plasma Docs**: https://docs.plasma.to
- **Privy Docs**: https://docs.privy.io
- **x402 Spec**: https://github.com/coinbase/x402
