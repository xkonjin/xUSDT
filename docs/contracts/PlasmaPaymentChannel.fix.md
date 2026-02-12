// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * PlasmaPaymentChannel Security Fixes
 * 
 * This file contains the recommended fixes for the PlasmaPaymentChannel contract.
 * Apply these changes to the main contract file.
 */

// =============================================================================
// FIX 1: Add Batch Size Limit to Prevent DoS
// =============================================================================

/**
 * Add this constant at the contract level:
 */
uint256 public constant MAX_BATCH_SIZE = 50;

/**
 * Modify the settleBatch function to include the limit check:
 */
function settleBatch(Receipt[] calldata receipts) external nonReentrant {
    // FIX: Add batch size limit to prevent DoS via gas exhaustion
    require(receipts.length > 0, "Empty batch");
    require(receipts.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");
    
    for (uint256 i = 0; i < receipts.length; i++) {
        _processReceipt(receipts[i]);
    }
}

// =============================================================================
// FIX 2: Minimum Fee for Micropayments
// =============================================================================

/**
 * Add this constant at the contract level:
 */
uint256 public constant MIN_FEE = 1; // 1 atomic unit minimum fee

/**
 * Modify the fee calculation to ensure minimum fee:
 */
function _calculateFee(uint256 grossAmount) internal view returns (uint256) {
    uint256 calculatedFee = (grossAmount * platformFeeBps) / 10_000;
    
    // FIX: Ensure minimum fee for non-zero amounts
    if (calculatedFee == 0 && grossAmount > 0) {
        return MIN_FEE;
    }
    
    return calculatedFee;
}

// =============================================================================
// FIX 3: Timelock for Fee Changes
// =============================================================================

/**
 * Add these state variables:
 */
uint256 public constant FEE_CHANGE_DELAY = 24 hours;
uint256 public pendingPlatformFeeBps;
uint256 public feeChangeTimestamp;
bool public feeChangePending;

/**
 * Replace setPlatformFeeBps with a two-step process:
 */
function proposeFeeChange(uint256 newFeeBps) external onlyOwner {
    require(newFeeBps <= 1000, "Fee too high"); // Max 10%
    
    pendingPlatformFeeBps = newFeeBps;
    feeChangeTimestamp = block.timestamp + FEE_CHANGE_DELAY;
    feeChangePending = true;
    
    emit FeeChangeProposed(platformFeeBps, newFeeBps, feeChangeTimestamp);
}

function executeFeeChange() external onlyOwner {
    require(feeChangePending, "No pending fee change");
    require(block.timestamp >= feeChangeTimestamp, "Timelock not expired");
    
    uint256 oldFee = platformFeeBps;
    platformFeeBps = pendingPlatformFeeBps;
    feeChangePending = false;
    
    emit FeeChanged(oldFee, platformFeeBps);
}

function cancelFeeChange() external onlyOwner {
    require(feeChangePending, "No pending fee change");
    
    feeChangePending = false;
    
    emit FeeChangeCancelled(pendingPlatformFeeBps);
}

/**
 * Add these events:
 */
event FeeChangeProposed(uint256 currentFee, uint256 proposedFee, uint256 effectiveTimestamp);
event FeeChanged(uint256 oldFee, uint256 newFee);
event FeeChangeCancelled(uint256 cancelledFee);

// =============================================================================
// FIX 4: Merge Redundant Functions
// =============================================================================

/**
 * Replace open() and topUp() with a single deposit() function:
 */
function deposit(uint256 amount) external nonReentrant {
    require(amount > 0, "Amount must be positive");
    
    // Transfer tokens from user
    token.safeTransferFrom(msg.sender, address(this), amount);
    
    // Update channel balance
    channels[msg.sender].balance += amount;
    
    emit Deposited(msg.sender, amount, channels[msg.sender].balance);
}

/**
 * Add this event:
 */
event Deposited(address indexed user, uint256 amount, uint256 newBalance);
