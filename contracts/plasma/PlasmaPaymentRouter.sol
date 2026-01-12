// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PlasmaPaymentRouter
 * @notice Simple ERC-20 router that deducts a protocol fee and forwards the net amount to the merchant.
 *         - Uses standard allowance-based transferFrom (no token standard extensions required).
 *         - Intended for direct on-chain settlements when channel balances are insufficient.
 *         - Protocol fee is expressed in basis points (bps). Default: 10 bps (0.1%).
 *
 * Rationale
 * - Keeps logic minimal and auditable on-chain
 * - Leaves gasless/EIP-712 flows to higher-level routers or channel receipts
 */
contract PlasmaPaymentRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Collector of protocol fees (e.g., treasury/multisig)
    address public feeCollector;

    /// @dev Platform fee in basis points (1 bps = 0.01%). 10 = 0.1%.
    uint256 public platformFeeBps;

    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event PlatformFeeUpdated(uint256 oldBps, uint256 newBps);
    event Settled(address indexed token, address indexed from, address indexed to, uint256 grossAmount, uint256 feeAmount, uint256 netAmount);

    constructor(address _feeCollector, uint256 _platformFeeBps) Ownable() {
        require(_feeCollector != address(0), "feeCollector=0");
        require(_platformFeeBps <= 10_000, "bps>100%");
        feeCollector = _feeCollector;
        platformFeeBps = _platformFeeBps; // recommended: 10 (0.1%)
    }

    /**
     * @notice Owner can update fee collector address.
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "collector=0");
        emit FeeCollectorUpdated(feeCollector, newCollector);
        feeCollector = newCollector;
    }

    /**
     * @notice Owner can update fee bps (max 10000).
     */
    function setPlatformFeeBps(uint256 newBps) external onlyOwner {
        require(newBps <= 10_000, "bps>100%");
        emit PlatformFeeUpdated(platformFeeBps, newBps);
        platformFeeBps = newBps;
    }

    /**
     * @notice Settle a payment by pulling tokens from `from` and sending net to `to`.
     * @param token ERC-20 token address
     * @param from  Payer address (must have approved this router for `grossAmount`)
     * @param to    Merchant recipient
     * @param grossAmount Amount in token smallest units
     */
    function settle(address token, address from, address to, uint256 grossAmount) external nonReentrant {
        require(token != address(0) && from != address(0) && to != address(0), "zero addr");
        require(grossAmount > 0, "amount=0");

        uint256 feeAmount = (grossAmount * platformFeeBps) / 10_000;
        uint256 netAmount = grossAmount - feeAmount;

        // Pull fee first, then net amount. Using SafeERC20 for non-standard returns.
        IERC20(token).safeTransferFrom(from, feeCollector, feeAmount);
        IERC20(token).safeTransferFrom(from, to, netAmount);

        emit Settled(token, from, to, grossAmount, feeAmount, netAmount);
    }
}


