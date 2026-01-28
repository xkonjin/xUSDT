```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PlasmaPaymentChannel
 * @dev A simple plasma payment channel contract.
 */
contract PlasmaPaymentChannel {

    // Define a constant for the maximum batch size to prevent gas exhaustion attacks.
    uint256 private constant MAX_BATCH_SIZE = 50;

    struct Receipt {
        address recipient;
        uint256 amount;
    }

    /**
     * @dev Settles a batch of payments.
     * This function is vulnerable to a gas exhaustion denial of service (DoS) attack
     * if an attacker provides a very large array of receipts.
     * @param receipts An array of payment receipts to be settled.
     */
    function settleBatch(Receipt[] memory receipts) public {
        // Security: Check if the batch is empty to prevent unnecessary gas usage.
        require(receipts.length > 0, "Batch cannot be empty.");

        // Security: Enforce a maximum batch size to prevent gas exhaustion DoS attacks.
        require(receipts.length <= MAX_BATCH_SIZE, "Exceeds maximum batch size.");

        for (uint i = 0; i < receipts.length; i++) {
            // In a real implementation, you would have logic here to transfer funds
            // to the recipient based on the receipt.
            // For example: payable(receipts[i].recipient).transfer(receipts[i].amount);
        }
    }
}
```
