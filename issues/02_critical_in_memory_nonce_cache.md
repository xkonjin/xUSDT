---
title: 'CRITICAL: Replace In-Memory Nonce Cache with Distributed Redis-Based Solution'
labels: security, critical, architecture, bug
---

## 1. Description

The `gasless_package` utilizes an in-memory `Map` to track used nonces for replay protection. This implementation is critically flawed for any production environment running more than a single server instance.

```typescript
// From gasless/src/relay-handler.ts
const usedNonces = new Map<string, number>();

// ...

if (usedNonces.has(nonce)) {
  // Nonce already used
}
usedNonces.set(nonce, Date.now());
```

Each server instance maintains its own separate nonce cache. This creates a race condition where an attacker can submit the same valid transaction authorization to multiple server instances simultaneously. Since the nonce is not yet in the cache of the other servers, they will all process the transaction, leading to a successful replay attack.

## 2. Impact

An attacker can **drain user funds** by replaying a single valid payment authorization across multiple API servers. This is a double-spend vulnerability that can lead to significant financial loss and undermines the integrity of the gasless payment system.

## 3. Modular Outcome (Acceptance Criteria)

- [ ] The in-memory `Map` for nonce tracking is completely removed from the `gasless` package.
- [ ] A new **`NonceManager`** module (`nonce-manager.ts`) is created to handle distributed nonce validation.
- [ ] The `NonceManager` uses **Redis** as its backend, leveraging atomic operations like `SETNX` to ensure thread-safe and distributed nonce tracking.
- [ ] The `relay-handler` is refactored to use the new `NonceManager` for checking and marking nonces as used.
- [ ] The system includes a graceful fallback to an in-memory nonce manager (with strong warnings logged) if a Redis connection cannot be established, preventing complete service failure in case of a Redis outage.
- [ ] Configuration is updated to include `REDIS_URL` for the nonce manager.

## 4. E2E Test Criteria

- **Objective:** Verify that the new Redis-based nonce manager correctly prevents replay attacks in a simulated distributed environment.

1.  **Single Nonce Replay Test:**
    *   Set up a test environment with a Redis instance.
    *   Submit a valid gasless transaction.
    *   **Expected Result:** The transaction succeeds.
    *   Immediately re-submit the *exact same* transaction to the API.
    *   **Expected Result:** The second transaction is rejected with a 
`Nonce already used` error.

2.  **Concurrent Request Test (Simulated Distributed Environment):**
    *   Create a test script that sends two identical, valid transaction requests concurrently to the API endpoint.
    *   **Expected Result:** One transaction succeeds, and the other one fails with a `Nonce already used` error. The recipient's balance should only be credited once.

3.  **Redis Failure Fallback Test:**
    *   Run the test suite with the `REDIS_URL` environment variable unset or pointing to an invalid address.
    *   **Expected Result:** The application logs a clear warning that it is falling back to the in-memory nonce manager. The single nonce replay test (from step 1) should still pass in this configuration.

## 5. Specialized Sub-Agent Requirements

- **Agent Name:** `Distributed_Systems_Engineer`
- **Skills:**
    - Expertise in Redis, including data structures and atomic operations (`SETNX`, `EXPIRE`).
    - Strong understanding of distributed systems concepts, race conditions, and concurrency.
    - Proficient in TypeScript and Node.js for backend development.
- **Responsibilities:**
    - Implement the `nonce-manager.ts` module with a robust Redis connection strategy and error handling.
    - Ensure the implementation is performant and does not introduce significant latency.
    - Write unit and integration tests for the nonce manager.

## 6. Resources & Best Practices

- **Resource:** [Redis `SET` command documentation (see `NX` and `EX` options)](https://redis.io/commands/set)
- **Resource:** [Node-Redis library documentation](https://github.com/redis/node-redis)
- **Best Practice:** The Redis key for nonces should include a prefix (e.g., `nonce:`) to avoid collisions with other data stored in Redis.
- **Best Practice:** Set a Time-To-Live (TTL) on all nonce keys (e.g., 24 hours) to ensure Redis does not fill up with old, irrelevant data. This is a cleanup mechanism, not the primary security feature.
