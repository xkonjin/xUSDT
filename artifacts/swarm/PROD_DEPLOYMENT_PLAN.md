# Production Deployment Plan

Generated: 2026-02-12
Workspace: /Users/a002/DEV/xUSDT

## Objective
Deploy and validate core production apps (`plasma-venmo`, `plasma-predictions`, `bill-split`) with deterministic rollback and post-deploy verification.

## Preconditions
1. Clean branch and all required checks passing.
2. Environment variable parity documented per app.
3. Vercel project root directories verified.
4. Runtime/toolchain compatibility validated in CI.

## Release Order
1. Preview deploy per app
2. Canary smoke tests
3. Production promotion
4. Post-prod observation + review

## App Matrix

### plasma-venmo
- Root: `/Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo`
- Required checks:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Production checks:
  - landing page + auth entry
  - send/request/claim API paths
  - security headers present

### plasma-predictions
- Root: `/Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-predictions`
- Required checks:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Production checks:
  - market listing renders
  - market detail navigation
  - betting modal and API validation paths

### bill-split
- Root: `/Users/a002/DEV/xUSDT/plasma-sdk/apps/bill-split`
- Required checks:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- Production checks:
  - create bill flow
  - retrieve bill flow
  - payment intent/settlement routes respond correctly

## Go/No-Go Gate

Go when all are true:
1. No open P0/P1 findings.
2. Required checks pass for target apps + shared packages touched.
3. Preview smoke test pass rate 100% on critical flows.
4. Rollback command path verified.

No-Go when any is true:
1. Any P0/P1 unresolved.
2. Failed build/typecheck/test in release scope.
3. Missing critical secrets/config.
4. Incomplete smoke evidence.

## Rollback Strategy

1. Immediate rollback trigger conditions
- sustained 5xx spike
- broken auth entry
- payment API critical failure

2. Rollback actions
- redeploy previous stable build on each affected app
- invalidate bad preview/production alias
- notify stakeholders with impact window and user-facing status

3. Verification after rollback
- health endpoint checks
- landing/auth checks
- critical API smoke checks

## Evidence Requirements

Capture in release report:
- deployment timestamps
- commit SHA per deployed artifact
- URL + HTTP status evidence
- smoke test command output
- screenshots/log snippets for major user flows
