# Monitoring & Alerting Setup

This document describes the monitoring and alerting infrastructure for Plenmo.

## Overview

Plenmo uses a multi-layered monitoring approach:

1. **Sentry** - Error tracking and performance monitoring
2. **Metrics Logger** - Structured logging for payment events
3. **Health Check** - Service health endpoint at `/api/health`
4. **Alerting** - Multi-channel alerts for failed transactions

## Quick Start

### Environment Variables

Add these to your `.env.local` or Vercel environment:

```bash
# Required for error tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Optional: Alert channels
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
ALERT_EMAIL=alerts@yourdomain.com
PAGERDUTY_ROUTING_KEY=xxx

# Optional: Metrics endpoint
METRICS_ENDPOINT=https://your-analytics.com/ingest
```

## Components

### 1. Sentry Error Tracking

**Setup:**
1. Create a project at [sentry.io](https://sentry.io)
2. Get your DSN and add it as `NEXT_PUBLIC_SENTRY_DSN`
3. Sentry auto-instruments Next.js routes

**Features:**
- Automatic error capture
- Performance monitoring (10% sample in production)
- Session replay for debugging
- Source maps (auto-uploaded in Vercel builds)

**Usage:**
```typescript
import { captureException, captureMessage, setUser } from '@/lib/monitoring';

// Track errors with context
captureException(error, {
  tags: { feature: 'payments' },
  extra: { txHash, amount },
  user: { id: userId, wallet: address },
});

// Track messages
captureMessage('Payment completed', 'info', { txHash });

// Set user context
setUser({ id: userId, wallet: address });
```

### 2. Payment Metrics

Structured logs for all payment events.

**Events tracked:**
- `payment_initiated` - Payment started
- `payment_success` - Payment completed
- `payment_failed` - Payment failed
- `payment_timeout` - Payment timed out

**Usage:**
```typescript
import {
  generateCorrelationId,
  logPaymentInitiated,
  logPaymentSuccess,
  logPaymentFailed,
} from '@/lib/monitoring';

// At payment start
const correlationId = generateCorrelationId();
logPaymentInitiated({ correlationId, amount, from, to });

// On success
logPaymentSuccess({
  correlationId,
  amount,
  from,
  to,
  txHash,
  blockNumber,
  duration: Date.now() - startTime,
});

// On failure
logPaymentFailed({
  correlationId,
  amount,
  from,
  to,
  error: error.message,
  errorCode: 'INSUFFICIENT_FUNDS',
});
```

**Log format:**
```
[METRIC][payment_success] {"type":"payment_success","timestamp":"2024-01-15T10:30:00Z","correlationId":"pay_1705312200_abc123","amount":"100.00","from":"0x...","to":"0x...","txHash":"0x...","duration":2500,"app":"plenmo","env":"production"}
```

### 3. Health Check Endpoint

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "abc1234",
  "environment": "production",
  "uptime": 86400,
  "checks": {
    "rpc": {
      "status": "pass",
      "latency": 150,
      "blockNumber": "12345678"
    },
    "relayer": {
      "status": "pass",
      "latency": 200,
      "balance": "0.050000",
      "address": "0x1234...5678"
    },
    "database": {
      "status": "pass",
      "latency": 5,
      "type": "PostgreSQL"
    },
    "redis": {
      "status": "pass",
      "latency": 2
    },
    "services": {
      "status": "pass",
      "configured": "4/4",
      "services": {
        "privy": true,
        "resend": true,
        "posthog": true,
        "sentry": true
      }
    }
  }
}
```

**Status codes:**
- `200` - Healthy or degraded
- `503` - Unhealthy (critical checks failing)

**Use cases:**
- Load balancer health checks
- Kubernetes liveness probes
- Uptime monitoring (Pingdom, Better Uptime)
- CI/CD deployment verification

### 4. Transaction Alerting

Automatic alerts when payments fail.

**Channels supported:**
- Slack (webhook)
- Discord (webhook)
- Email (via Resend)
- PagerDuty (for critical issues)

**Severity levels:**
| Level | Trigger | PagerDuty |
|-------|---------|-----------|
| `critical` | Service configuration errors | Yes |
| `high` | Failed transactions ≥$1000 | Yes |
| `medium` | Failed transactions $100-$999 | No |
| `low` | Validation errors | No |

**Usage:**
```typescript
import { alertTransactionFailed } from '@/lib/monitoring';

// Called automatically in payment routes
await alertTransactionFailed({
  correlationId,
  error: error.message,
  errorCode: 'TX_REVERTED',
  amount: '500.00',
  from: senderAddress,
  to: recipientAddress,
});
```

## Vercel Integration

### Source Maps

Sentry source maps are automatically uploaded during Vercel builds when:
1. `NEXT_PUBLIC_SENTRY_DSN` is set
2. `SENTRY_AUTH_TOKEN` is set (for upload)
3. `SENTRY_ORG` and `SENTRY_PROJECT` are set

### Analytics

For additional analytics, enable Vercel Analytics:
1. Go to your Vercel project
2. Navigate to Analytics tab
3. Enable Web Vitals and Audiences

This provides:
- Core Web Vitals monitoring
- Page performance insights
- User session analytics

## Dashboards

### Recommended Sentry Alerts

1. **High error rate** - >10 errors in 5 minutes
2. **New issue** - First occurrence of any error
3. **Critical errors** - Errors tagged with `severity: critical`
4. **Payment failures** - Errors in payment routes

### Log Queries

For Vercel logs or external log aggregators:

```
# All payment events
[METRIC][payment_*]

# Failed payments only
[METRIC][payment_failed]

# Payments over $100
[METRIC][payment_success] amount>100

# By correlation ID
correlationId:"pay_1705312200_abc123"
```

## Runbooks

### High Error Rate

1. Check `/api/health` for service status
2. Review Sentry for error details
3. Check relayer wallet balance
4. Verify RPC endpoint is responding
5. Check for Plasma chain issues

### Payment Failures

1. Get correlation ID from alert
2. Search logs for full trace
3. Check error code:
   - `INSUFFICIENT_FUNDS` - User balance issue
   - `TX_REVERTED` - Check contract state
   - `TIMEOUT` - RPC or network issue
   - `NONCE_EXPIRED` - Authorization expired

### Degraded Health

1. Check which checks are failing
2. For RPC issues: Check Plasma status page
3. For relayer issues: Fund wallet or rotate key
4. For database issues: Check connection pool

## Testing Monitoring

```bash
# Test health endpoint
curl http://localhost:3005/api/health | jq

# Trigger test error (dev only)
curl -X POST http://localhost:3005/api/test-error

# View logs
vercel logs --follow
```
