# Open Risks And Next Steps

Generated: 2026-02-13T13:33:15Z
Workspace: /Users/a002/DEV/xUSDT

## Open Risks

### P0
- `plasma-venmo` production `/api/health` returns `503` (unhealthy).
- `plasma-predictions` production domain is missing (`DEPLOYMENT_NOT_FOUND`).
- `bill-split` expected production smoke API path `/api/bills` returns `404`.

### P1
- Vercel project settings are incompatible with this monorepo workspace model for app-scoped projects (`@plasma-pay/*` install/resolve failures).
- Node version in Vercel projects is `24.x`; this is outside the documented safe deployment target in app guidance.

### P2
- Default system-python regression command fails due missing `pytest` on `python3.14`.
- Production security-header consistency is not verified across all required apps (predictions unavailable).

### P3
- Non-blocking build/test warnings remain (metadata viewport and test-console warnings).

## Next Steps (Execution Order)
1. Apply blocker fixes from `/Users/a002/DEV/xUSDT/artifacts/swarm/BLOCKERS.md`.
2. Re-run deploy sequence (preview then prod) for venmo, predictions, bill-split.
3. Re-run production smoke and update:
- `/Users/a002/DEV/xUSDT/artifacts/swarm/PROD_SMOKE_RAW.txt`
- `/Users/a002/DEV/xUSDT/artifacts/swarm/PROD_VALIDATION_REPORT.md`
4. Re-run post-prod audit and refresh:
- `/Users/a002/DEV/xUSDT/artifacts/swarm/POST_PROD_REVIEW.md`
- `/Users/a002/DEV/xUSDT/artifacts/swarm/SECURITY_GO_NO_GO.md`
5. When all P0/P1 are closed, proceed with final hardening PR(s) and merge.
