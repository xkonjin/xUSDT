# Open Risks And Next Steps

Generated: 2026-02-12T15:03:54Z
Workspace: /Users/a002/DEV/xUSDT

## Open Risks

### P0
- `plasma-venmo` health endpoint is unhealthy in production (`/api/health` returns `503`).
- `plasma-predictions` production deployment is missing (`DEPLOYMENT_NOT_FOUND`).

### P1
- High regression volume in Playwright Chromium suite (74 failed tests).
- `@plasma-pay/venmo` lint/test gates fail, blocking merge confidence.
- `@plasma-pay/ui` test suite has broad drift (10 failing suites).

### P2
- System python runtime gate fails (`python3 -m pytest -q`), requiring non-default py311 venv workaround.
- `bill-split` production host does not expose expected API smoke route (`/api/bills` returned 404).

### P3
- Residual lint warnings in several apps (e.g., mobile unused variable, bill-split image warnings).
- Build-time warnings around metadata viewport and third-party dependency traces.

## Next Steps (Execution Order)
1. Unblock venmo lint config incompatibility and fix failing venmo unit/integration tests.
2. Triage `@plasma-pay/ui` failing suites (API drift between tests and current component contracts).
3. Burn down Playwright failures by category:
   - accessibility suite
   - bill-split API/landing expectations
   - claim/full-flow expectation drift
4. Establish deterministic python test runtime in CI (pin py311/py312 and install pytest path explicitly).
5. Link/deploy `plasma-predictions` Vercel project, then rerun live smoke.
6. Validate bill-split production API routing with deployed app config (or update smoke endpoint to correct route shape).
7. Re-run full regression bundle:
   - `cd /Users/a002/DEV/xUSDT && npm run lint && npm run build && npm run test`
   - `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. python3 -m pytest -q` (or approved py311 path)
   - `cd /Users/a002/DEV/xUSDT/v0 && npm run build`
   - `cd /Users/a002/DEV/xUSDT/plasma-sdk && npm run build`
   - `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright test --project=chromium`
8. Only after all above pass:
   - open module-scoped PRs
   - run two independent reviewer passes per PR
   - resolve P0/P1 findings
   - merge and perform final post-prod review.
