# Agent Gate Matrix

Generated: 2026-02-12T15:02:40Z
Workspace: /Users/a002/DEV/xUSDT
Branch: codex/swarm-multiagent-exec

## Agent-01 Contracts (root)
Scope: /Users/a002/DEV/xUSDT/contracts, /Users/a002/DEV/xUSDT/test, /Users/a002/DEV/xUSDT/scripts
- `cd /Users/a002/DEV/xUSDT && npm run lint && npm run build && npm run test` -> PASS
- Notes: lint produced Solhint warnings only (no blocking errors); Hardhat tests 19 passing.

## Agent-02 Python Backend
Scope: /Users/a002/DEV/xUSDT/agent, /Users/a002/DEV/xUSDT/tests
- `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. python3 -m pytest -q` -> FAIL (No module named pytest under python3.14)
- `cd /Users/a002/DEV/xUSDT && python3.11 -m venv .venv311 && ./.venv311/bin/pip install -r requirements.txt && PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 ./.venv311/bin/python -m pytest -q` -> PASS (52 passed)
- Notes: runtime/toolchain mismatch remains for system python path.

## Agent-03 v0 Frontend
Scope: /Users/a002/DEV/xUSDT/v0
- `cd /Users/a002/DEV/xUSDT/v0 && npm run build` -> PASS

## Agent-04 Shared Packages Core/Gasless/x402
- core:
  - `npm run typecheck` -> PASS
  - `npm run test` -> PASS (107 passed)
  - `npm run build` -> PASS
- gasless:
  - `npm run typecheck` -> PASS
  - `npm run test` -> PASS (47 passed)
  - `npm run build` -> PASS
- x402:
  - `npm run typecheck` -> PASS
  - `npm run build` -> PASS

## Agent-05 Shared Packages DB/UI/Analytics/Aggregator/Share/Privy
- db: `typecheck/build` -> PASS
- analytics: `typecheck/build` -> PASS
- aggregator: `typecheck/build` -> PASS
- share: `typecheck/test/build` -> PASS (74 passed)
- privy-auth: `typecheck/build` -> PASS
- ui:
  - `npm run build` -> PASS
  - `npm run test` -> FAIL (10 failed suites, 9 passed suites; 34 failed tests, 266 passed tests)

## Agent-06 Plasma Venmo
Scope: /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo
- `npm run lint` -> FAIL (Next lint invalid options: useEslintrc/extensions/...)
- `npm run typecheck` -> PASS
- `npm run test` -> FAIL (7 failed suites, 19 passed suites; 29 failed tests, 289 passed tests)
- `npm run build` -> PASS

## Agent-07 Plasma Predictions
Scope: /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-predictions
- `npm run lint` -> PASS
- `npm run typecheck` -> PASS
- `npm run test` -> PASS (14 suites, 193 tests)
- `npm run build` -> PASS

## Agent-08 Bill Split + Stream + Subkiller + Telegram + Mobile + Splitzy Bot
- bill-split: `lint/typecheck/test/build` -> PASS (lint warnings only)
- plasma-stream: `lint/typecheck/test/build` -> PASS
- subkiller: `lint/typecheck/test/build` -> PASS
- telegram-webapp: `lint/typecheck/test/build` -> PASS
- mobile: `lint/typecheck/test/build` -> PASS (lint warning: unused var)
- splitzy-bot: `typecheck/build` -> PASS

## Agent-09 CI/Test Infra Reliability
Scope: /Users/a002/DEV/xUSDT/.github/workflows/ci.yml, /Users/a002/DEV/xUSDT/plasma-sdk/playwright.config.ts, /Users/a002/DEV/xUSDT/plasma-sdk/tests/e2e/*, /Users/a002/DEV/xUSDT/plasma-sdk/scripts/start-all-apps.sh
- Port/config alignment changes applied (scripts + Playwright + CI server startup ownership).
- `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright test --project=chromium` -> FAIL
- Evidence: /Users/a002/DEV/xUSDT/plasma-sdk/test-results/.last-run.json reports 74 failed tests.

## Agent-10 Security + Deployment + Production Validation
- `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo && bash ./scripts/preflight-check.sh` -> FAIL (dirty worktree warning + script dependency check issues)
- `cd /Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo && bash ./scripts/verify-vercel.sh` -> PASS
- Live smoke/headers evidence captured in:
  - /Users/a002/DEV/xUSDT/artifacts/swarm/PROD_SMOKE_RAW.txt
- Highlights:
  - plasma-venmo root: 200
  - plasma-venmo /api/health: 503 unhealthy (relayer invalid params + redis not configured)
  - plasma-predictions root/api: 404 DEPLOYMENT_NOT_FOUND
  - bill-split root: 200, /api/bills: 404 (route not deployed on that host)

## Full Regression Summary
- `cd /Users/a002/DEV/xUSDT && npm run lint && npm run build && npm run test` -> PASS
- `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. python3 -m pytest -q` -> FAIL (system interpreter)
- `cd /Users/a002/DEV/xUSDT/v0 && npm run build` -> PASS
- `cd /Users/a002/DEV/xUSDT/plasma-sdk && npm run build` -> PASS
- `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright install --with-deps chromium` -> PASS
- `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright test --project=chromium` -> FAIL
