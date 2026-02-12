# Module Ownership Matrix

Generated: 2026-02-12
Workspace: /Users/a002/DEV/xUSDT

## Agent-01 Contracts
- Scope:
  - `/Users/a002/DEV/xUSDT/contracts`
  - `/Users/a002/DEV/xUSDT/test`
  - `/Users/a002/DEV/xUSDT/scripts`
- Primary outputs:
  - Solidity correctness
  - Hardhat compile/test/lint health

## Agent-02 Python Backend
- Scope:
  - `/Users/a002/DEV/xUSDT/agent`
  - `/Users/a002/DEV/xUSDT/tests`
- Primary outputs:
  - FastAPI reliability
  - settlement correctness
  - persistence/rate limit stability

## Agent-03 v0 Frontend + Proxy
- Scope:
  - `/Users/a002/DEV/xUSDT/v0`
- Primary outputs:
  - Next.js build integrity
  - proxy route behavior

## Agent-04 Shared Packages (Core/Gasless/x402)
- Scope:
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/core`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/gasless`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/x402`
- Primary outputs:
  - protocol primitives
  - type correctness
  - package build/test health

## Agent-05 Shared Packages (DB/UI/Analytics/Aggregator/Share/Privy)
- Scope:
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/db`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/ui`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/analytics`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/aggregator`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/share`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/packages/privy-auth`
- Primary outputs:
  - shared component and service stability
  - db/prisma runtime alignment

## Agent-06 Plasma Venmo
- Scope:
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo`
- AGENTS contract:
  - must follow `plasma-sdk/apps/plasma-venmo/AGENTS.md`
- Primary outputs:
  - send/request/claim flows
  - app lint/typecheck/test/build gates

## Agent-07 Plasma Predictions
- Scope:
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-predictions`
- AGENTS contract:
  - must follow `plasma-sdk/apps/plasma-predictions/AGENTS.md`
- Primary outputs:
  - market browsing + betting logic integrity

## Agent-08 Remaining Apps
- Scope:
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/bill-split`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-stream`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/subkiller`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/telegram-webapp`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/mobile`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/splitzy-bot`
- AGENTS contract:
  - must follow bill-split/stream AGENTS where present
- Primary outputs:
  - app-by-app script gate health

## Agent-09 CI/Test Infra Reliability
- Scope:
  - `/Users/a002/DEV/xUSDT/.github/workflows/ci.yml`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/playwright.config.ts`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/tests/e2e/*`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/scripts/start-all-apps.sh`
- Mandatory outcome:
  - eliminate port/config drift and startup conflicts

## Agent-10 Security/Deployment/Prod Validation
- Scope:
  - vercel configs/scripts and security headers/rate limits
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo/scripts/preflight-check.sh`
  - `/Users/a002/DEV/xUSDT/plasma-sdk/apps/plasma-venmo/scripts/verify-vercel.sh`
- Mandatory outcome:
  - go/no-go checklist + rollback procedure
