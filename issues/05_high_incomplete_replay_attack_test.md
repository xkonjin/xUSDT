---
title: 'HIGH: Complete Implementation of EIP-712 Replay Attack Test'
labels: security, high, testing, bug
---

## 1. Description

The test suite contains a file intended to test for EIP-712 replay attacks on the `PaymentRouter` smart contract. However, the test case is incomplete and does not contain the necessary logic to actually perform the replay attempt and assert its failure.

The file `tests/test_facilitator.py` contains JavaScript code embedded within it, and the relevant test case is truncated:

```javascript
// from tests/test_facilitator.py
describe("PaymentRouter", function () {
  it("Should not allow replay of EIP-712 signature", async function () {
    // ... setup code ...
    // Test logic is missing here
  });
});
```

This represents a critical gap in test coverage for a major security vulnerability.

## 2. Impact

Without a reliable, automated test to verify replay protection, a vulnerability could be introduced into the `PaymentRouter` contract during a future update without being detected. This could lead to the re-emergence of a double-spend vulnerability, allowing attackers to steal funds.

## 3. Modular Outcome (Acceptance Criteria)

- [ ] A new, dedicated test file (`test/PaymentRouter.replay.spec.ts`) is created for testing the `PaymentRouter` contract's security features.
- [ ] The incomplete JavaScript test code is removed from `tests/test_facilitator.py`.
- [ ] The new test file contains a complete test case that performs the following steps:
    1.  Signs a valid `TransferWithAuthorization` message.
    2.  Submits it to the `settleWithAuthorization` function and confirms it succeeds.
    3.  Immediately re-submits the *exact same* signature and parameters to the function.
    4.  Asserts that the second transaction is reverted with the expected error message (e.g., `"Authorization already used"`).
- [ ] The test is integrated into the Hardhat test suite and runs successfully as part of the CI pipeline.

## 4. E2E Test Criteria

- **Objective:** The test itself is the E2E criterion. Its successful execution and failure under the right conditions prove the fix.

1.  **Run the new test suite:**
    *   Execute `npx hardhat test test/PaymentRouter.replay.spec.ts`.
    *   **Expected Result:** The test passes, confirming that the contract correctly rejects the replayed signature.

2.  **Temporary Modification Test (Negative Test):**
    *   Temporarily comment out the `_setNonceUsed` line in the `PaymentRouter.sol` contract.
    *   Re-run the replay attack test.
    *   **Expected Result:** The test **fails**, proving that the test case is correctly identifying the replay vulnerability when it exists.

## 5. Specialized Sub-Agent Requirements

- **Agent Name:** `Hardhat_Test_Engineer`
- **Skills:**
    - Expertise in testing Solidity contracts with Hardhat and Ethers.js.
    - Strong understanding of EIP-712 and signature replay attack vectors.
    - Proficient in TypeScript for writing clean and maintainable tests.
- **Responsibilities:**
    - Implement the complete replay attack test case as described in the acceptance criteria.
    - Ensure the test is robust and correctly integrated into the project's testing framework.
    - Clean up the old, mixed-language test file.

## 6. Resources & Best Practices

- **Resource:** [Hardhat Tutorial: Writing Tests](https://hardhat.org/tutorial/testing-contracts)
- **Resource:** [Ethers.js `signTypedData` documentation](https://docs.ethers.org/v5/api/signer/#Signer-signTypedData)
- **Best Practice:** Security-critical functionality must have dedicated, isolated test files. Do not mix tests for different languages or frameworks in a single file.
- **Best Practice:** Tests should be written to be deterministic and self-contained, without relying on a specific execution order.
