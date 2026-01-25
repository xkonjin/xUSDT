# Plenmo Test Report

Date: 2026-01-25

## Test Runs

### Jest (npm test)
- Result: Failed to start
- Error: `jest: command not found`
- Notes: `npm install` in `plasma-sdk/` failed with `EUNSUPPORTEDPROTOCOL Unsupported URL Type "workspace:"`.

### Playwright (npm run test:e2e)
- Result: Failed to start
- Error: `playwright: command not found`
- Notes: Same workspace install blocker as above.

## Coverage Gaps (Payment + Security Focus)
- `src/lib/send.ts` did not have direct unit tests for direct transfer vs. claim flow behavior.
- `src/app/api/submit-transfer/route.ts` lacks unit tests for security checks (mock mode, relayer key validation, amount limits, auth window).
- `src/app/api/claims/route.ts` and `src/app/api/claims/[token]/route.ts` lack tests for claim creation/claim execution edge cases.
- `src/app/api/resolve-recipient/route.ts` lacks tests for invalid identifiers and mock-mode behavior.
- No automated tests validate rate limit enforcement on payment routes beyond config tests.

## Tests Added
- `src/lib/__tests__/send.test.ts`
  - Direct transfer success and submit-transfer failure.
  - Claim flow success and claim creation failure.
  - Claim flow blocked when escrow address is missing.
  - Recipient resolution failure handling.

## Follow-Up Recommendations
- Resolve workspace install issue to enable Jest/Playwright execution.
- Add API route tests for submit-transfer/claims with mocked Prisma + relayer clients.
- Add Playwright coverage for send flow + claim flow (email path + claim execution).
