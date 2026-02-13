# Full Regression Report

Generated: 2026-02-13T13:33:15Z
Workspace: /Users/a002/DEV/xUSDT
Branch: codex/swarm-multiagent-exec

## Requested Phase-4 Commands

1. `cd /Users/a002/DEV/xUSDT && npm run lint && npm run build && npm run test`
- Result: PASS
- Evidence: Hardhat suite `19 passing`; lint warnings only.

2. `cd /Users/a002/DEV/xUSDT && PYTHONPATH=. python3 -m pytest -q`
- Result: FAIL
- Error: `No module named pytest`

3. `cd /Users/a002/DEV/xUSDT/v0 && npm run build`
- Result: PASS

4. `cd /Users/a002/DEV/xUSDT/plasma-sdk && npm run build`
- Result: PASS

5. `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright install --with-deps chromium`
- Result: PASS

6. `cd /Users/a002/DEV/xUSDT/plasma-sdk && npx playwright test --project=chromium`
- Result: PASS
- Evidence: `306` tests executed; `/Users/a002/DEV/xUSDT/plasma-sdk/test-results/.last-run.json` shows `{"status":"passed","failedTests":[]}`.

## Additional Local Module Gates

### Plasma Venmo
- `npm run lint` -> PASS
- `npm run typecheck && npm run test && npm run build` -> PASS
- Test evidence: `24 suites`, `297 tests` all passing.

### Plasma Predictions
- `npm run lint` -> PASS
- `npm run typecheck && npm run test && npm run build` -> PASS
- Test evidence: `14 suites`, `193 tests` all passing.

### Agent-08 app sweep
- bill-split: lint/typecheck/test/build -> PASS
- plasma-stream: lint/typecheck/test/build -> PASS
- subkiller: lint/typecheck/test/build -> PASS
- telegram-webapp: lint/typecheck/test/build -> PASS
- mobile: lint/typecheck/test/build -> PASS
- splitzy-bot: typecheck/build -> PASS (no lint/test scripts)

### SDK package sweep
- core: typecheck/test/build -> PASS
- gasless: typecheck/test/build -> PASS
- x402: typecheck/build -> PASS
- db: typecheck/build -> PASS
- ui: test/build -> PASS
- analytics: typecheck/build -> PASS
- aggregator: typecheck/build -> PASS
- share: typecheck/test/build -> PASS
- privy-auth: typecheck/build -> PASS

## Summary
- Local regression status: GREEN for Node/TS contracts/apps/packages and Playwright.
- Remaining blocker: default system-python regression command fails until `pytest` is installed on `python3.14`.
