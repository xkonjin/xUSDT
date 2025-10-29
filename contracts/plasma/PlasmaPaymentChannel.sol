// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PlasmaPaymentChannel
 * @notice Pre-funded multi-payer payment channel for amortized micropayments with protocol fee.
 *         - Payers deposit USDT₀ (or any ERC-20) into their channel balance (single channel per payer).
 *         - Off-chain receipts (EIP-712) authorize spending toward merchants.
 *         - Relayer/merchant batches receipts on-chain via settleBatch; fee (bps) is deducted on each receipt.
 *         - No dynamic floor here: channel-first flow uses a flat percentage (e.g., 10 bps = 0.1%).
 */
contract PlasmaPaymentChannel is Ownable, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Receipt {
        address payer;      // channel owner who signed the receipt
        address merchant;   // recipient of funds
        uint256 amount;     // amount in token units
        bytes32 serviceId;  // opaque service/resource identifier
        bytes32 nonce;      // single-use nonce per payer
        uint64  expiry;     // unix seconds; must be >= block.timestamp
    }

    /// @dev EIP-712 typehash for Receipt
    bytes32 public constant RECEIPT_TYPEHASH = keccak256(
        "Receipt(address payer,address merchant,uint256 amount,bytes32 serviceId,bytes32 nonce,uint64 expiry)"
    );

    /// @dev Token held in channels (USDT₀ on Plasma)
    IERC20 public immutable token;

    /// @dev Collector of protocol fees
    address public feeCollector;

    /// @dev Platform fee in basis points. 10 bps = 0.1%.
    uint256 public platformFeeBps;

    /// @dev Channel balances by payer
    mapping(address => uint256) public channelBalance;

    /// @dev Nonce usage tracking per payer to prevent replay
    mapping(address => mapping(bytes32 => bool)) public nonceUsed;

    event ChannelOpened(address indexed payer, uint256 amount);
    event ChannelFunded(address indexed payer, uint256 amount);
    event ReceiptSettled(address indexed payer, address indexed merchant, uint256 grossAmount, uint256 feeAmount, uint256 netAmount, bytes32 nonce);
    event Withdrawn(address indexed payer, uint256 amount);
    event FeesCollected(address indexed collector, uint256 amount);
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event PlatformFeeUpdated(uint256 oldBps, uint256 newBps);

    constructor(address _token, address _feeCollector, uint256 _platformFeeBps)
        EIP712("PlasmaPaymentChannel", "1")
        Ownable()
    {
        require(_token != address(0) && _feeCollector != address(0), "zero addr");
        require(_platformFeeBps <= 10_000, "bps>100%");
        token = IERC20(_token);
        feeCollector = _feeCollector;
        platformFeeBps = _platformFeeBps; // recommended 10 bps (0.1%)
    }

    // ----------------------
    // Admin controls
    // ----------------------
    function setFeeCollector(address newCollector) external onlyOwner {
        require(newCollector != address(0), "collector=0");
        emit FeeCollectorUpdated(feeCollector, newCollector);
        feeCollector = newCollector;
    }

    function setPlatformFeeBps(uint256 newBps) external onlyOwner {
        require(newBps <= 10_000, "bps>100%");
        emit PlatformFeeUpdated(platformFeeBps, newBps);
        platformFeeBps = newBps;
    }

    // ----------------------
    // Channel lifecycle
    // ----------------------
    /**
     * @notice Open a channel by depositing tokens. Requires prior token approval to this contract.
     */
    function open(uint256 amount) external nonReentrant {
        require(amount > 0, "amount=0");
        channelBalance[msg.sender] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit ChannelOpened(msg.sender, amount);
    }

    /**
     * @notice Add funds to the caller's existing channel.
     */
    function topUp(uint256 amount) external nonReentrant {
        require(amount > 0, "amount=0");
        channelBalance[msg.sender] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit ChannelFunded(msg.sender, amount);
    }

    /**
     * @notice Withdraw unused funds from the caller's channel.
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "amount=0");
        uint256 bal = channelBalance[msg.sender];
        require(bal >= amount, "insufficient");
        channelBalance[msg.sender] = bal - amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ----------------------
    // Settlement
    // ----------------------
    /**
     * @notice Batch-settle multiple receipts across payers and merchants.
     *         Each receipt must verify under EIP-712 and must not be expired or replayed.
     *         Fee is deducted per receipt at platformFeeBps and sent to feeCollector.
     */
    function settleBatch(Receipt[] calldata receipts, bytes[] calldata signatures) external nonReentrant {
        require(receipts.length == signatures.length, "len mismatch");
        uint256 totalFees;

        for (uint256 i = 0; i < receipts.length; i++) {
            Receipt calldata rc = receipts[i];
            require(rc.expiry >= uint64(block.timestamp), "expired");
            require(!nonceUsed[rc.payer][rc.nonce], "nonce used");
            require(rc.amount > 0, "amount=0");

            // Verify signature over typed data
            bytes32 structHash = keccak256(abi.encode(
                RECEIPT_TYPEHASH,
                rc.payer,
                rc.merchant,
                rc.amount,
                rc.serviceId,
                rc.nonce,
                rc.expiry
            ));
            bytes32 digest = _hashTypedDataV4(structHash);
            address signer = ECDSA.recover(digest, signatures[i]);
            require(signer == rc.payer && signer != address(0), "bad sig");

            // Mark nonce used before external calls
            nonceUsed[rc.payer][rc.nonce] = true;

            // Spend from payer's channel
            uint256 bal = channelBalance[rc.payer];
            require(bal >= rc.amount, "channel underfunded");

            uint256 fee = (rc.amount * platformFeeBps) / 10_000; // 10 bps default
            uint256 net = rc.amount - fee;

            // Update payer balance
            channelBalance[rc.payer] = bal - rc.amount;

            // Transfer to merchant and accumulate fees
            token.safeTransfer(rc.merchant, net);
            totalFees += fee;

            emit ReceiptSettled(rc.payer, rc.merchant, rc.amount, fee, net, rc.nonce);
        }

        if (totalFees > 0) {
            token.safeTransfer(feeCollector, totalFees);
            emit FeesCollected(feeCollector, totalFees);
        }
    }
}


