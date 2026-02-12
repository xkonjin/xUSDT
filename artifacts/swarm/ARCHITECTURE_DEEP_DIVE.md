# xUSDT / Plasma SDK Architecture Deep Dive

Generated: 2026-02-12
Workspace: /Users/a002/DEV/xUSDT

## 1. System Topology

This repository is a multi-runtime payment platform with four major layers:

1. Smart contract layer (Solidity + Hardhat)
- Root: `/Users/a002/DEV/xUSDT/contracts`
- Core contracts:
  - `PaymentRouter.sol`
  - `plasma/PlasmaPaymentRouter.sol`
  - `plasma/PlasmaPaymentChannel.sol`
  - `MockUSDT.sol`

2. Python merchant/facilitator backend (FastAPI)
- Root: `/Users/a002/DEV/xUSDT/agent`
- Entrypoint: `agent/merchant_service.py`
- Responsibilities:
  - x402 flows (`PaymentRequired`/`PaymentSubmitted`/`PaymentCompleted`)
  - EIP-3009 settlement relay path (Plasma)
  - optional router/gasless typed-data endpoints
  - prediction/polymarket route mounting

3. Next.js demo frontend (`v0`)
- Root: `/Users/a002/DEV/xUSDT/v0`
- Role: demo checkout/merchant-client flow + API proxy routes.

4. Plasma SDK monorepo
- Root: `/Users/a002/DEV/xUSDT/plasma-sdk`
- Apps:
  - `plasma-venmo`, `plasma-predictions`, `bill-split`, `plasma-stream`
  - `subkiller`, `telegram-webapp`, `mobile`, `splitzy-bot`
- Shared packages:
  - `core`, `gasless`, `x402`, `db`, `ui`, `analytics`, `aggregator`, `share`, `privy-auth`

## 2. Runtime and Build Surfaces

### Root
- Node scripts: lint/build/test for contracts
- Python tests under `/Users/a002/DEV/xUSDT/tests`
- CI workflow validates contracts + python + v0 + plasma-sdk + playwright.

### v0
- Next.js app independent from plasma-sdk workspaces
- `npm ci` succeeds in current environment.

### plasma-sdk
- Turborepo workspace model with app-local scripts and package-level build/typecheck/test.
- Multiple E2E suites under `/Users/a002/DEV/xUSDT/plasma-sdk/tests/e2e`.

## 3. Key Control Flows

### A) Merchant pay flow (root)
1. Client requests resource (`/premium` or `/product/{sku}`)
2. Merchant returns `402 payment-required` with invoice/payment options
3. Client signs EIP-3009 auth and submits `/pay`
4. Facilitator relays to chain and returns settlement receipt
5. Merchant marks invoice confirmed and returns `payment-completed`

### B) Plasma SDK app flow
1. App UI collects intent + amount + recipient/market input
2. Shared packages (`gasless`, `core`, `privy-auth`, `db`) mediate signing and APIs
3. API routes execute validations and persistence
4. Optional analytics/share integrations publish side effects

## 4. Current CI/Testing Observations

Detected mismatches in CI/test infra:
- App dev ports in package scripts differ from Playwright URL assumptions.
- E2E test files hardcode URLs inconsistently (`3001/3002/3004/3005`) while app scripts define others (`3005/3006/3007/3008/3009/3010`).
- CI e2e job starts dev servers manually while Playwright config also defines `webServer` processes.

## 5. Environment/Toolchain Reality in this machine

- Node: `v25.4.0`
- npm: `11.7.0`
- Python: `3.14.2`

Blocking incompatibilities observed:
- Root `npm ci` fails due package-lock drift.
- `plasma-sdk` install fails due `workspace:*` protocol handling with npm in this environment.
- Python requirements pin `pydantic==2.7.1` / `pydantic-core==2.18.2`, which fails to build on Python 3.14.

## 6. Architectural Strengths

- Clear separation between contracts, backend orchestrator, and frontend apps.
- Strong test footprint across unit and E2E suites.
- Shared package architecture encourages reuse.
- App-specific AGENTS guidance exists for key high-change apps.

## 7. Architectural Risks

- Toolchain drift (Node/Python versions) can break local/CI parity.
- Workspace install strategy not currently robust across package managers.
- E2E infra coupling to hardcoded localhost URLs increases flaky failures.
- Deployment settings (Vercel root directory/env consistency) still requires stricter automation.

## 8. Immediate Stabilization Priorities

1. Normalize CI + Playwright + app port contract.
2. Remove hardcoded E2E URLs in favor of shared env-driven base URLs.
3. Enforce pinned runtime versions (Node/Python) and validate preflight.
4. Resolve workspace dependency install strategy (`workspace:*` vs npm behavior).
5. Establish deterministic production smoke-check checklist with evidence capture.
