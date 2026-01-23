# Plenmo Deployment Guide

Production deployment guide for Plenmo on Vercel.

## Prerequisites

- Vercel account
- GitHub repository access
- Environment variables configured
- Domain (optional)

## Quick Deploy

### 1. Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
cd plasma-sdk/apps/plasma-venmo
vercel link
```

### 2. Configure Environment Variables

Set these in Vercel dashboard or via CLI:

**Required:**
```bash
# Network Configuration
NEXT_PUBLIC_ETH_RPC=https://ethereum.publicnode.com
NEXT_PUBLIC_PLASMA_RPC=https://rpc.plasma.to
NEXT_PUBLIC_ETH_CHAIN_ID=1
NEXT_PUBLIC_PLASMA_CHAIN_ID=9745

# Token Addresses
NEXT_PUBLIC_USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
NEXT_PUBLIC_USDT0_ADDRESS=0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb
NEXT_PUBLIC_USDT0_NAME=USDTe
NEXT_PUBLIC_USDT0_VERSION=1

# X402 Wallets (Server-side)
CLIENT_ADDRESS=0xa7C542386ddA8A4edD9392AB487ede0507bDD281
CLIENT_PRIVATE_KEY=0x70afdd16c876c8b9c39bae396f6dcb9e23cc1aa404da46bb8e21786ce520f27a
RELAYER_ADDRESS=0xdEc34d821a100ae7a632cAF36161C5651D0d5dF9
RELAYER_PRIVATE_KEY=0xf1ed152903164a1a49c97c806f4e62af994e0549f5bb7b4033b483d447a32b84
MERCHANT_ADDRESS=0x03BD07c84B6D9682E238ec865B34bECFE045d09A
MERCHANT_PRIVATE_KEY=0x8af3dc686e12bb45302b90974e85524c794f4b792711ab3bf549fedce7cf9e64

# API Authentication
API_AUTH_SECRET=QpQG9f9kR23J1edDLgOjiTEqvVJz3IxUbg2fNRhJoHI

# Fee Configuration
NEXT_PUBLIC_PLATFORM_FEE_BPS=10
FLOOR_SAFETY_FACTOR_BPS=150
DIRECT_SETTLE_GAS_UNITS=120000
DIRECT_SETTLE_FLOOR_ATOMIC=0

# Operational
PREFER_PLASMA=false
DRY_RUN=false

# Privy (for wallet connection)
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here
```

**Optional:**
```bash
# Analytics
NEXT_PUBLIC_GA_ID=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Feature Flags
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=false
```

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or via GitHub (automatic)
git push origin main
```

## Vercel Configuration

### Build Settings

**Framework Preset:** Next.js

**Build Command:**
```bash
cd ../.. && npm run build:venmo
```

**Output Directory:**
```
.next
```

**Install Command:**
```bash
npm install
```

**Root Directory:**
```
plasma-sdk/apps/plasma-venmo
```

### Environment Variables

Set in Vercel Dashboard:
1. Go to Project Settings
2. Navigate to Environment Variables
3. Add all variables from `.env.production`
4. Ensure sensitive keys are encrypted

### Domain Configuration

**Custom Domain:**
1. Add domain in Vercel dashboard
2. Update DNS records
3. Enable HTTPS (automatic)

**Recommended:**
- `plenmo.app` - Production
- `staging.plenmo.app` - Staging
- `dev.plenmo.app` - Development

## Post-Deployment

### 1. Verify Deployment

```bash
# Check deployment status
vercel ls

# View logs
vercel logs
```

### 2. Test Critical Paths

**Homepage:**
```bash
curl https://plenmo.app
```

**API Health:**
```bash
curl https://plenmo.app/api/payment
```

**Balance Check:**
```bash
curl "https://plenmo.app/api/balance?address=0xa7C542386ddA8A4edD9392AB487ede0507bDD281"
```

### 3. Monitor Performance

**Vercel Analytics:**
- Core Web Vitals
- Real User Monitoring
- Error tracking

**Custom Monitoring:**
- API response times
- Transaction success rate
- Wallet connection rate

## Troubleshooting

### Build Failures

**Issue:** TypeScript errors
```bash
# Fix locally first
npm run typecheck
npm run build
```

**Issue:** Missing dependencies
```bash
# Install all dependencies
npm install
cd ../.. && npm install
```

### Runtime Errors

**Issue:** Environment variables not set
- Check Vercel dashboard
- Ensure all required vars are set
- Redeploy after adding vars

**Issue:** API authentication fails
- Verify `API_AUTH_SECRET` is set
- Check request headers
- Review API logs

### Performance Issues

**Issue:** Slow initial load
- Enable compression
- Check bundle size
- Review Lighthouse report

**Issue:** API timeouts
- Check RPC endpoint status
- Increase timeout limits
- Review relayer balance

## Security Checklist

- [ ] All private keys in environment variables
- [ ] API authentication enabled
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Error messages sanitized
- [ ] Secrets not in logs
- [ ] Dependencies updated

## Rollback Procedure

### Quick Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Manual Rollback

1. Identify last working commit
2. Revert changes
3. Push to main
4. Wait for automatic deployment

## Monitoring

### Key Metrics

**Performance:**
- First Contentful Paint < 1.8s
- Largest Contentful Paint < 2.5s
- Time to Interactive < 3.2s

**Reliability:**
- Uptime > 99.9%
- Error rate < 0.1%
- API success rate > 99%

**Business:**
- Daily active users
- Transaction volume
- Payment success rate

### Alerts

Set up alerts for:
- Deployment failures
- High error rates
- API downtime
- Low relayer balance
- Security incidents

## Maintenance

### Regular Tasks

**Daily:**
- Check error logs
- Monitor transaction volume
- Verify relayer balance

**Weekly:**
- Review performance metrics
- Update dependencies
- Check security advisories

**Monthly:**
- Rotate API secrets
- Audit access logs
- Review cost optimization

## Support

**Issues:**
- GitHub Issues: https://github.com/xkonjin/xUSDT/issues
- Email: support@plenmo.app

**Documentation:**
- API Docs: `/docs/api`
- User Guide: `/docs/guide`
- FAQ: `/docs/faq`

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Plasma Network](https://plasma.to)
- [USDT0 Documentation](https://docs.usdt0.com)
