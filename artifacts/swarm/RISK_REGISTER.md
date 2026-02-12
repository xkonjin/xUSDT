# Risk Register

Generated: 2026-02-12
Workspace: /Users/a002/DEV/xUSDT

## Severity Legend
- P0: release blocker / data-loss / security critical
- P1: major reliability/correctness risk
- P2: moderate quality or operability risk
- P3: low priority cleanup risk

## Active Risks

1. [P1] Root lockfile drift prevents deterministic install
- Evidence: `npm ci` at `/Users/a002/DEV/xUSDT` fails lock sync.
- Impact: CI/local reproducibility degraded.
- Mitigation: regenerate lock with pinned npm version and validate.

2. [P1] Python runtime incompatibility with pinned deps on 3.14
- Evidence: `pydantic-core==2.18.2` fails build on Python 3.14.
- Impact: backend tests/setup blocked on current runtime.
- Mitigation: run with Python 3.11/3.12 in CI/local, or upgrade pydantic stack.

3. [P1] `plasma-sdk` workspace install instability
- Evidence: `EUNSUPPORTEDPROTOCOL workspace:*` during install.
- Impact: workspace bootstrap can fail on developer machines/CI variants.
- Mitigation: normalize dependency spec strategy and enforce package manager toolchain.

4. [P1] Playwright/CI/app port mismatches
- Evidence: hardcoded E2E URLs do not align with app scripts.
- Impact: high e2e flake/fail probability.
- Mitigation: centralize base URLs via env and align webServer + CI startup.

5. [P2] Duplicated dev server startup logic in CI e2e stage
- Evidence: workflow starts servers manually while Playwright config also starts web servers.
- Impact: port conflicts / non-deterministic startup timing.
- Mitigation: single source of startup responsibility (Playwright webServer or external, not both).

6. [P2] Preflight/deploy scripts not fully generalized for all apps
- Evidence: strong focus on plasma-venmo script path.
- Impact: uneven deployment confidence for predictions/bill-split.
- Mitigation: extract reusable deployment preflight matrix.

7. [P2] Existing checked-in local env files under plasma-sdk
- Evidence: `.env.local` and other local env files present under `plasma-sdk`.
- Impact: secret exposure risk if mishandled.
- Mitigation: verify ignores, sanitize references, avoid commit of any secret-bearing changes.

## Resolved/Planned in this swarm run
- Planned now:
  - fix CI/test port and startup contract
  - produce production go/no-go and rollback documentation
- Deferred if blocked by credentials/toolchain:
  - live deploy operations
  - PR creation/merge in remote platform
