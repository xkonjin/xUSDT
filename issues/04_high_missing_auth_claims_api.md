---
title: 'HIGH: Add Session-Based Authentication to Protect `/api/claims` Endpoint'
labels: security, high, api, bug
---

## 1. Description

The `GET` endpoint at `/api/claims` is unprotected and lacks any form of authentication. It allows any user to query the claims associated with any sender address by simply providing the address as a query parameter.

```typescript
// from /api/claims/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const senderAddress = searchParams.get("senderAddress");

  if (!senderAddress) {
    // ... error handling
  }

  const claims = await prisma.claim.findMany({
    where: { senderAddress },
  });

  return NextResponse.json({ claims });
}
```

This exposes sensitive user transaction data to the public.

## 2. Impact

Any unauthorized party can access potentially sensitive information for any user, including:
- **Transaction History:** A complete list of who the user has sent payments to.
- **Recipient Information:** The email addresses or phone numbers of payment recipients.
- **Payment Amounts:** The value of each transaction.
- **Claim Statuses:** The current state of each payment (e.g., pending, completed, failed).

This is a significant privacy violation and could be used to de-anonymize users or build a social graph of payment activity.

## 3. Modular Outcome (Acceptance Criteria)

- [ ] The `/api/claims` endpoint is refactored to require session-based authentication.
- [ ] A new **`withAuth` middleware** is created to protect API routes.
- [ ] The middleware verifies the user's session (e.g., by validating a session cookie or a Privy auth token).
- [ ] The endpoint logic is modified to **only** return claims where the `senderAddress` matches the address of the authenticated user.
- [ ] Any attempt to query claims for a different address, even by an authenticated user, is rejected.
- [ ] Unauthenticated requests to the endpoint are rejected with a `401 Unauthorized` error.

## 4. E2E Test Criteria

- **Objective:** Verify that the claims API is properly secured and only returns data to the authenticated, authorized user.

1.  **Unauthenticated Request Test:**
    *   Make a `GET` request to `/api/claims?senderAddress=<some_address>` without any session cookie or auth token.
    *   **Expected Result:** The request fails with a `401 Unauthorized` status code.

2.  **Authenticated Request (Correct User):**
    *   Log in as User A (address `0xA...`).
    *   Make a `GET` request to `/api/claims` (no query parameter needed, or with `senderAddress=0xA...`).
    *   **Expected Result:** The request succeeds, and the API returns only the claims belonging to User A.

3.  **Authenticated Request (Incorrect User):**
    *   Log in as User A (address `0xA...`).
    *   Make a `GET` request to `/api/claims?senderAddress=<address_of_user_B>`.
    *   **Expected Result:** The request is rejected with a `403 Forbidden` status code, or the API returns an empty array, enforcing that a user can only view their own data.

## 5. Specialized Sub-Agent Requirements

- **Agent Name:** `NextJS_Auth_Specialist`
- **Skills:**
    - Expertise in Next.js API routes and middleware.
    - Experience with authentication libraries like NextAuth.js or integrating with third-party auth providers like Privy.
    - Strong understanding of session management, cookies, and JWTs.
- **Responsibilities:**
    - Implement the `withAuth` middleware for protecting API routes.
    - Integrate the middleware with the existing authentication system (Privy).
    - Refactor the `/api/claims` endpoint and any other sensitive endpoints to use the new middleware.

## 6. Resources & Best Practices

- **Resource:** [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- **Resource:** [Privy Documentation for Session Management](https://docs.privy.io/guide/server-side-auth)
- **Best Practice:** All API endpoints that return user-specific data must be protected by authentication and authorization checks. Never trust user-supplied identifiers (like query parameters) to determine data access rights; always use the identity from the authenticated session.
