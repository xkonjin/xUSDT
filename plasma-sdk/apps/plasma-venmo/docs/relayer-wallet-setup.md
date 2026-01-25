# Relayer Wallet Setup Guide

This guide covers the setup and management of relayer wallets for Plenmo's gasless transaction system.

## Overview

Plenmo uses two relay mechanisms:

1. **Plasma Gasless API** (`/api/relay`) - Plasma covers gas costs, requires `PLASMA_RELAYER_SECRET`
2. **Local Relayer Wallet** - Your own wallet pays gas for payment links, claims, referrals, etc.

This guide focuses on the **Local Relayer Wallet** setup.

## Quick Start

### 1. Generate a Relayer Wallet

```bash
# Using cast (foundry)
cast wallet new

# Or using Node.js
node -e "console.log(require('viem/accounts').generatePrivateKey())"
```

### 2. Configure Environment Variables

Add to your `.env.local` (development) or Vercel dashboard (production):

```bash
# Required
RELAYER_PRIVATE_KEY=0x...your-64-char-hex-private-key...
RELAYER_ADDRESS=0x...your-relayer-address...

# Optional - for admin API
API_AUTH_SECRET=generate-a-secure-random-string

# Optional - for alerts
RELAYER_ALERT_WEBHOOK=https://your-webhook-endpoint.com/alerts
RELAYER_WALLET_LABEL=primary

# Optional - balance thresholds
RELAYER_MIN_NATIVE_BALANCE=0.01
RELAYER_MIN_USDT0_BALANCE=10
```

### 3. Fund the Wallet

The relayer wallet needs:
- **XPL (native token)** - for gas fees (~0.1 XPL should last thousands of transactions)
- **USDT0 (optional)** - only if wallet needs to hold USDT0 for operations

Send XPL to your relayer address on Plasma mainnet.

## Admin API

### Check Wallet Status

```bash
# Single wallet status
curl -H "X-API-Secret: $API_AUTH_SECRET" \
  https://your-app.com/api/admin/relayer

# All wallets (rotation mode)
curl -H "X-API-Secret: $API_AUTH_SECRET" \
  "https://your-app.com/api/admin/relayer?all=true"
```

**Response:**
```json
{
  "mode": "single",
  "address": "0x...",
  "label": "primary",
  "balances": {
    "native": {
      "wei": "100000000000000000",
      "formatted": "0.1",
      "symbol": "XPL",
      "low": false
    },
    "usdt0": {
      "atomic": "10000000",
      "formatted": "10.0",
      "symbol": "USDT0",
      "low": false
    }
  },
  "estimatedTxRemaining": 1250,
  "alerts": {
    "lowNativeBalance": false,
    "lowUsdt0Balance": false,
    "critical": false
  }
}
```

### Trigger Alert Check

```bash
# Check and send webhook alert if needed
curl -X POST -H "X-API-Secret: $API_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-webhook.com/alerts"}' \
  https://your-app.com/api/admin/relayer

# Force send alert (for testing)
curl -X POST -H "X-API-Secret: $API_AUTH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-webhook.com/alerts", "forceAlert": true}' \
  https://your-app.com/api/admin/relayer
```

## Webhook Alerts

Configure `RELAYER_ALERT_WEBHOOK` to receive low balance alerts.

### Alert Payload

```json
{
  "type": "low_native_balance",
  "walletAddress": "0x...",
  "walletLabel": "primary",
  "nativeBalance": "0.005",
  "usdt0Balance": "100.0",
  "estimatedTxRemaining": 62,
  "timestamp": 1706000000000,
  "message": "⚠️ Relayer wallet \"primary\" has low XPL balance: 0.005 XPL. ~62 transactions remaining."
}
```

### Alert Types

| Type | Trigger | Severity |
|------|---------|----------|
| `low_native_balance` | XPL < threshold (default 0.01) | Warning ⚠️ |
| `low_usdt0_balance` | USDT0 < threshold (default $10) | Warning ⚠️ |
| `critical_balance` | Both low | Critical 🚨 |

### Slack Webhook Example

```bash
RELAYER_ALERT_WEBHOOK=https://hooks.slack.com/services/T.../B.../xxx
```

The alert message is designed to work with Slack's incoming webhooks.

### Discord Webhook

For Discord, you'll need a proxy to transform the payload:
```json
{
  "content": "{{message}}"
}
```

## Wallet Rotation (Advanced)

For high-volume applications, configure multiple wallets:

```bash
# Comma-separated list: label:privatekey,label:privatekey
RELAYER_WALLETS=primary:0xkey1,backup:0xkey2,spare:0xkey3

# Rotation strategy: round-robin, highest-balance, lowest-nonce
RELAYER_ROTATION_STRATEGY=highest-balance
```

### Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `round-robin` | Cycles through wallets in order | Even distribution |
| `highest-balance` | Uses wallet with most XPL | Maximizing uptime |
| `lowest-nonce` | Uses wallet with lowest nonce | Preventing stuck txs |

## Monitoring Best Practices

### Cron Job Setup

Set up a cron job to check balances periodically:

```bash
# Every hour
0 * * * * curl -X POST -H "X-API-Secret: $SECRET" \
  -d '{"webhookUrl": "https://..."}' \
  https://your-app.com/api/admin/relayer
```

### Vercel Cron

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/relayer",
      "schedule": "0 * * * *"
    }
  ]
}
```

Create `/api/admin/relayer/cron/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { checkAndAlert } from '@/lib/relayer-wallet';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Verify cron secret
  if (process.env.CRON_SECRET !== request.headers.get('Authorization')?.replace('Bearer ', '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { status, alertsSent } = await checkAndAlert({
    webhookUrl: process.env.RELAYER_ALERT_WEBHOOK,
    enabled: true,
  });

  return NextResponse.json({ status, alertsSent });
}
```

### Recommended Thresholds

| Environment | Min XPL | Min USDT0 |
|-------------|---------|-----------|
| Development | 0.001 | 1 |
| Staging | 0.01 | 10 |
| Production | 0.1 | 100 |

## Security Considerations

### Private Key Protection

1. **Never commit** private keys to git
2. Use **environment variables** or secret managers
3. **Rotate keys** periodically
4. Use **hardware wallets** for high-value operations

### API Secret

The `API_AUTH_SECRET` should be:
- At least 32 characters
- Randomly generated
- Stored securely (Vercel secrets, etc.)

Generate one:
```bash
openssl rand -hex 32
```

### IP Allowlisting

Consider restricting admin API access by IP:

```typescript
// In route.ts
const allowedIPs = ['1.2.3.4', '5.6.7.8'];
const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0];
if (!allowedIPs.includes(clientIP)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Troubleshooting

### "Relayer wallet not configured"

Check that `RELAYER_PRIVATE_KEY` is set and valid:
- Must be 64 hex characters (or 66 with 0x prefix)
- No whitespace or newlines
- Valid hex characters only (0-9, a-f, A-F)

### "Payment service configuration error"

The private key validation failed. Check server logs for details.

### Transactions Failing

1. Check XPL balance (run out of gas?)
2. Check nonce (stuck transaction?)
3. Check RPC connectivity

### Webhook Not Receiving Alerts

1. Test webhook URL with `forceAlert: true`
2. Check webhook accepts POST with JSON
3. Verify no firewall blocking outbound requests

## API Reference

### `getRelayerWalletStatus(config?)`

Returns current relayer wallet status.

```typescript
import { getRelayerWalletStatus } from '@/lib/relayer-wallet';

const status = await getRelayerWalletStatus({
  minNativeBalance: 0.05,
  minUsdt0Balance: 50,
});

console.log(status);
// {
//   address: '0x...',
//   nativeBalance: '0.1',
//   usdt0Balance: '100.0',
//   lowNativeBalance: false,
//   lowUsdt0Balance: false,
//   estimatedTxRemaining: 1250,
// }
```

### `checkAndAlert(config)`

Checks status and sends webhook alerts if thresholds exceeded.

```typescript
import { checkAndAlert } from '@/lib/relayer-wallet';

const { status, alertsSent } = await checkAndAlert({
  webhookUrl: 'https://...',
  minNativeBalance: 0.01,
  minUsdt0Balance: 10,
  enabled: true,
});
```

### `parseRotationConfigFromEnv()`

Parses wallet rotation configuration from environment variables.

```typescript
import { parseRotationConfigFromEnv, selectWallet } from '@/lib/relayer-wallet';

const config = parseRotationConfigFromEnv();
if (config) {
  const wallet = await selectWallet(config);
  console.log(`Using wallet: ${wallet.label}`);
}
```
