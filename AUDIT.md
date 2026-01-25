# xUSDT / Plasma SDK Audit

## Scope
- Repo-wide audit with emphasis on x402 payment flow.
- Ran available linters/tests where possible.
- Reviewed current issue/PR tracking docs in repo.

## 1) Open Issues (7) and PRs (1 expected)
Source: `prd.json`

Issues (7 total):
- US-001: Fix broad exception catches in facilitator (Issue #223)
- US-003: Fix nonce cache unbounded growth (Issue #229)
- US-004: Add rate limiting to merchant endpoints (Issue #212)
- US-002: Fix duplicate splitSignature function (Issue #221)
- US-005: Add smart contract admin function tests (Issue #217)
- US-006: Fix mobile responsive quick amount buttons (Issue #225)
- US-007: Add accessibility attributes to form inputs (Issue #218)

PRs:
- Repo reports mention 2 open PRs: #41 and #19 (see `CURRENT_STATUS_REPORT.md`, `FINAL_RALPH_LOOP_REPORT.md`).
- If the expected single open PR is different, please confirm which PR to track.

## 2) Linters / Code Quality
- Root lint (`npm run lint`): failed (missing `solhint` in PATH). See `package.json` script uses `solhint`.
- Plasma SDK lint (`npm run lint` in `plasma-sdk`): failed (missing `turbo` in PATH).

## 3) CI / Tests
- No CI workflow files found under `.github/workflows`.
- Root tests (`npm test` / Hardhat): 3 failures due to `@nomicfoundation/hardhat-ethers` missing `./internal/constants` with Node v25.4.0 (unsupported by Hardhat).
- Python tests (`pytest -q`): pytest not installed in environment.
- Plasma SDK tests (`npm test` in `plasma-sdk`): not run (would require Playwright + browsers).

## 4) x402 Payment Implementation Review
Key findings:
- **Protocol schema divergence between Python and TypeScript implementations.**
  - Python models (`agent/x402_models.py`) define `decimals`, `scheme` values `erc20-gasless-router`, `eip3009-transfer-with-auth`, `eip3009-receive`, and top-level `signature` + `scheme` in `PaymentSubmitted`.
  - TS SDK (`plasma-sdk/packages/x402/src/types.ts`, `client.ts`, `middleware.ts`) uses `tokenDecimals`, schemes `eip3009-receive-with-auth`/`direct-transfer`, and `authorization` object instead of `signature` + `scheme`.
  - Result: payloads produced by the SDK are not compatible with the Python merchant service’s `/pay` model, and vice versa.
- **Invoice IDs in x402 middleware were generated using `Math.random`,** which is weak for uniqueness and predictability. This is now fixed (see “Fixes Started”).
- **Plasma PaymentRequired nonce hint was only 16 bytes of entropy** due to `uuid4().hex` padding. This is now fixed (see “Fixes Started”).

## 5) Prioritized Fix Plan
1. **Align x402 protocol schema across Python and TS**
   - Unify field names (`decimals` vs `tokenDecimals`), `scheme` values, and `PaymentSubmitted` shape.
   - Provide a compatibility adapter or versioned schema to avoid breaking current clients.
2. **Stabilize tooling/CI**
   - Pin Node to supported Hardhat version (Node 18/20) and document it.
   - Ensure `solhint` and `turbo` are installed and runnable in CI and local dev.
3. **Complete remaining PRD issues (US-001..US-007)**
   - Validate rate limiting coverage, finalize duplicate signature removal, and add tests.
4. **Add/restore CI workflows**
   - Add minimal pipelines for Hardhat tests and Plasma SDK lint/typecheck.
5. **Expand x402 security validation**
   - Add schema/format validation in TS middleware/client and server endpoints.

## 6) Fixes Started
- Improved Plasma PaymentRequired nonce entropy: switched to `random_nonce32()`.
  - File: `agent/merchant_agent.py`
- Strengthened invoice ID generation in x402 middleware using `crypto.randomUUID` with fallback.
  - File: `plasma-sdk/packages/x402/src/middleware.ts`

## 7) Next Items To Fix (in progress)
- Resolve x402 schema incompatibility between Python and TS implementations.
- Restore working lint/test environment for Hardhat and Turbo.

