# BLOCKERS

Updated: 2026-02-12T15:03:01Z
Workspace: /Users/a002/DEV/xUSDT

## 1) PR Review Loop Cannot Close (P0/P1-equivalent test gates still red)
Status: BLOCKED

Open blockers:
- `@plasma-pay/venmo` lint fails:
  - Command: `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo && npm run lint`
  - Error: Next lint invalid/removed options (`useEslintrc`, `extensions`, etc.)
- `@plasma-pay/venmo` tests fail:
  - Command: `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo && npm run test`
  - Result: 7 failed suites, 19 passed suites.
- `@plasma-pay/ui` tests fail:
  - Command: `cd /Users/a002/DEV/xUSDT/plasma-sdk/packages/ui && npm run test`
  - Result: 10 failed suites, 9 passed suites.
- E2E regression fails:
  - Command: `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright test --project=chromium`
  - Evidence: `/Users/a002/DEV/xUSDT/plasma-sdk/test-results/.last-run.json` shows 74 failed tests.

Exact next commands:
1. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo && npm run lint && npm run test`
2. `cd /Users/a002/DEV/xUSDT/plasma-sdk/packages/ui && npm run test`
3. `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright test --project=chromium`

## 2) System Python Gate Fails on Default Runtime
Status: BLOCKED

- Required command fails:
  - `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. python3 -m pytest -q`
  - Error: `No module named pytest` (system python3.14 environment)
- Workaround command passes in py311 venv:
  - `python3.11 -m venv .venv311 && ./.venv311/bin/pip install -r requirements.txt && PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 ./.venv311/bin/python -m pytest -q`

Exact next commands:
1. `python3.11 -m venv /Users/a002/DEV/xUSDT/.venv311`
2. `/Users/a002/DEV/xUSDT/.venv311/bin/pip install -r /Users/a002/DEV/xUSDT/requirements.txt`
3. `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 ./.venv311/bin/python -m pytest -q`

## 3) Production Validation Blocked for Required Apps (predictions/bill-split)
Status: BLOCKED

- Live check evidence:
  - `https://plasma-predictions.vercel.app` => `404 DEPLOYMENT_NOT_FOUND`
  - `https://plasma-predictions.vercel.app/api/markets` => `404 DEPLOYMENT_NOT_FOUND`
  - `https://bill-split.vercel.app/api/bills` => `404` (route absent on that deployment)
- Local Vercel link exists only for `plasma-venmo`.

Exact next commands:
1. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-predictions && npx vercel link --yes`
2. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-predictions && npx vercel --yes`
3. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-predictions && npx vercel --prod --yes`
4. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/bill-split && npx vercel link --yes`
5. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/bill-split && npx vercel --yes`
6. `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/bill-split && npx vercel --prod --yes`

## 4) Full Auth/Payment Production Journeys Need Test Identities and Safe Funds
Status: BLOCKED

Missing inputs:
- Dedicated test accounts/wallets for production smoke (sender/recipient).
- Explicit approval for production-value payment path execution.

Exact next commands (after credentials/data provided):
1. `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright test tests/e2e/full-flow.spec.ts --project=chromium`
2. `curl -i https://plasma-venmo.vercel.app/api/health`
3. `curl -i https://plasma-predictions.vercel.app/api/markets`
4. `curl -i "https://bill-split.vercel.app/api/bills?address=<TEST_WALLET>"`
