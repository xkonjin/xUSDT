# Production Validation Report

Generated: 2026-02-13T13:33:15Z
Workspace: /Users/a002/DEV/xUSDT
Evidence source: `/Users/a002/DEV/xUSDT/artifacts/swarm/PROD_SMOKE_RAW.txt`

## Deployment Attempt Status
- `plasma-venmo` preview deploy attempted, build failed due workspace/module resolution.
- `plasma-predictions` project created and deploy attempted, build failed (`npm install` could not resolve `@plasma-pay/core`).
- `bill-split` project created and deploy attempted, build failed (`npm install` could not resolve `@plasma-pay/aggregator`).

## Live Endpoint Smoke (current public URLs)

### plasma-venmo
- `https://plasma-venmo.vercel.app` -> `200`
- `https://plasma-venmo.vercel.app/api/health` -> `503`
- `https://plasma-venmo.vercel.app/api/relay` -> `503` (`Gasless relayer not configured`)

### plasma-predictions
- `https://plasma-predictions.vercel.app` -> `404 DEPLOYMENT_NOT_FOUND`
- `https://plasma-predictions.vercel.app/api/markets` -> `404 DEPLOYMENT_NOT_FOUND`

### bill-split
- `https://bill-split.vercel.app` -> `200`
- `https://bill-split.vercel.app/api/bills?address=0x1234567890123456789012345678901234567890` -> `404`

### Failed deployment URLs (auth-protected/incomplete)
- `https://plasma-predictions-mp612lj0c-jins-projects-d67d72af.vercel.app` -> `401`
- `https://bill-split-akkdhhzrb-jins-projects-d67d72af.vercel.app` -> `401`

## Header Snapshot (sampled)
- `plasma-venmo` root includes:
  - `strict-transport-security`
  - `x-frame-options: DENY`
  - `x-content-type-options: nosniff`
  - `referrer-policy: strict-origin-when-cross-origin`
- `plasma-predictions` production host currently unavailable (`404`), so full header validation is blocked.
- `bill-split` root responds `200`, but sampled response did not include the same hardening header set as venmo.

## Critical Journey Validation Outcome
- Landing/navigation:
  - venmo: PASS (reachable)
  - predictions: FAIL (deployment missing)
  - bill-split: PARTIAL (landing reachable)
- Auth entry points:
  - Cannot complete across required apps due deployment failures.
- Core payment/request/claim journeys:
  - BLOCKED for required cross-app production validation.

## Decision
- Production validation status: **NO-GO**
- Primary blockers:
  1. venmo health/relay not healthy.
  2. predictions production deployment missing.
  3. bill-split API route not reachable on current production host.
