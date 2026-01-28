---
title: 'HIGH: Add Batch Size Limit to `settleBatch` to Prevent Gas Exhaustion DoS'
labels: security, high, smart-contract, bug
---

## 1. Description

The `settleBatch` function in the `PlasmaPaymentChannel.sol` smart contract iterates over an array of receipts to process multiple settlements in a single transaction. However, the function does not enforce any limit on the size of the `receipts` array.

```solidity
function settleBatch(Receipt[] calldata receipts) external nonReentrant {
    for (uint256 i = 0; i < receipts.length; i++) {
        _processReceipt(receipts[i]);
    }
}
```

A malicious actor can exploit this by calling `settleBatch` with an extremely large array of receipts. The gas cost of executing the loop will eventually exceed the block gas limit, causing the transaction to fail. This can be used to perpetually block the settlement of all batch transactions.

## 2. Impact

This vulnerability allows for a **Denial of Service (DoS)** attack on the batch settlement functionality. An attacker can effectively halt all legitimate batch settlements by repeatedly sending a transaction with a large payload that consumes the entire block's gas, preventing other, valid transactions from being included.

## 3. Modular Outcome (Acceptance Criteria)

- [ ] A new constant, `MAX_BATCH_SIZE`, is added to the `PlasmaPaymentChannel.sol` contract (e.g., with a value of 50).
- [ ] The `settleBatch` function is modified to include a `require` statement that validates the length of the `receipts` array against `MAX_BATCH_SIZE`.
- [ ] The `require` statement is the first check in the function to ensure it runs before the expensive loop begins.
- [ ] The contract is successfully re-deployed with the fix.

## 4. E2E Test Criteria

- **Objective:** Verify that the contract correctly enforces the batch size limit and rejects oversized batches.

1.  **Valid Batch Size Test:**
    *   Submit a batch settlement with a number of receipts equal to or less than `MAX_BATCH_SIZE`.
    *   **Expected Result:** The transaction succeeds, and all receipts in the batch are processed correctly.

2.  **Exceed Batch Size Test:**
    *   Attempt to submit a batch settlement with a number of receipts greater than `MAX_BATCH_SIZE` (e.g., 51).
    *   **Expected Result:** The transaction is immediately reverted with a clear error message, such as "Batch size exceeds limit".

3.  **Empty Batch Test:**
    *   Attempt to submit a batch settlement with an empty array.
    *   **Expected Result:** The transaction is reverted, as processing an empty batch is a waste of gas (a `require(receipts.length > 0)` should also be added).

## 5. Specialized Sub-Agent Requirements

- **Agent Name:** `Solidity_Security_Auditor`
- **Skills:**
    - Deep expertise in Solidity and smart contract security patterns.
    - Knowledge of common attack vectors, including gas limit issues and DoS attacks.
    - Proficient with Hardhat and Ethers.js for testing.
- **Responsibilities:**
    - Implement the fix by adding the `MAX_BATCH_SIZE` constant and the `require` check.
    - Write the corresponding Hardhat tests to cover the E2E criteria.
    - Analyze the contract for any other potential gas-related vulnerabilities.

## 6. Resources & Best Practices

- **Resource:** [Solidity Gas Patterns and Limits](https://consensys.github.io/smart-contract-best-practices/attacks/denial-of-service/)
- **Best Practice:** Always be mindful of unbounded loops in smart contracts. Any loop that iterates over user-supplied data must have a strict, reasonable upper bound to prevent gas exhaustion attacks.
