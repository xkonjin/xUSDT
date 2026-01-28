---
title: 'CRITICAL: Refactor System to Eliminate Direct Private Key Handling'
labels: security, critical, architecture
---

## 1. Description

The current system architecture has a critical security flaw: **direct private key handling**. Private keys are loaded from environment variables or configuration files and used directly within application code to sign transactions. This practice is extremely dangerous and exposes the system to a high risk of catastrophic fund loss.

This vulnerability was identified across multiple domains:
- **`agent_facilitator`**: The Python facilitator loads the relayer key from settings.
- **`plenmo_api_routes`**: The Next.js API routes load `RELAYER_PRIVATE_KEY` from `process.env`.
- **`gasless_package`**: The `signer.ts` module contains functions that accept raw private keys.
- **`x402_package`**: The facilitator uses a raw `executorKey` for signing.

**Example (from `plenmo_api_routes`):**
```typescript
const { key: RELAYER_KEY, error: relayerError } = getValidatedRelayerKey();
if (!RELAYER_KEY || relayerError) {
  // ... error handling
}
const account = privateKeyToAccount(RELAYER_KEY);
```

## 2. Impact

A compromise of the application server, CI/CD pipeline, or any environment where the private key is stored as a plain text variable would lead to **immediate and irreversible theft of all funds** from the associated wallets. The attack surface includes log files, shell history, process memory, and insecurely stored environment files.

## 3. Modular Outcome (Acceptance Criteria)

- [ ] All direct references to `RELAYER_PRIVATE_KEY`, `executorKey`, or any other private key variable are removed from the application codebase.
- [ ] A new **KMS Signer Service** (`kms-signer.ts`) is created and integrated as the sole method for cryptographic signing.
- [ ] The KMS Signer Service abstracts away the underlying signing mechanism (e.g., AWS KMS, HashiCorp Vault).
- [ ] The application configuration is updated to use KMS-related parameters (e.g., `KMS_PROVIDER`, `AWS_KMS_KEY_ID`) instead of raw private keys.
- [ ] All transaction signing logic in `agent_facilitator`, `plenmo_api_routes`, and other affected modules is refactored to use the KMS Signer Service.
- [ ] The `signTransferAuthorizationWithKey` function and similar direct-key-handling functions in the `gasless_package` are marked as deprecated with strong warnings.

## 4. E2E Test Criteria

- **Objective:** Verify that the system can still process payments successfully using the new KMS-based signing architecture, and that direct key access is impossible.

1.  **Successful Payment Flow:**
    *   Configure the system to use a mock/local KMS signer.
    *   Initiate a gasless payment via the Plenmo UI or API.
    *   **Expected Result:** The transaction is successfully signed by the mock KMS service, relayed to the blockchain, and confirmed. The recipient's balance increases correctly.

2.  **Private Key Unavailability Test:**
    *   Unset the `LOCAL_DEV_KEY` environment variable and configure the KMS provider to a non-existent endpoint.
    *   Attempt to start the server or run a payment.
    *   **Expected Result:** The application fails to start or immediately fails the payment with a clear error indicating a KMS configuration problem. It should **not** fall back to any other signing method.

3.  **Security Scan:**
    *   Run a static code analysis scan (e.g., `grep -r 
private_key"` across the codebase.
    *   **Expected Result:** The scan returns no results in the application source code, confirming all direct references have been removed.

## 5. Specialized Sub-Agent Requirements

- **Agent Name:** `KMS_Architecture_Specialist`
- **Skills:**
    - Deep knowledge of AWS KMS, HashiCorp Vault, and other signing provider APIs.
    - Expertise in secure backend architecture and cryptographic best practices.
    - Proficient in TypeScript and Python for refactoring.
- **Responsibilities:**
    - Implement the `kms-signer.ts` module with robust error handling and provider-specific logic.
    - Lead the refactoring effort across all affected domains.
    - Write comprehensive documentation for the new signing service.

## 6. Resources & Best Practices

- **Resource:** [AWS KMS Developer Guide](https://docs.aws.amazon.com/kms/latest/developerguide/overview.html)
- **Resource:** [HashiCorp Vault API Documentation](https://www.vaultproject.io/api-docs)
- **Best Practice:** The principle of least privilege should be applied. The application should only have permission to *request* signatures for specific transaction types, not to access the key material itself.
- **Best Practice:** Implement audit logging for every signature request made to the KMS, including the requester's identity and the transaction hash.
