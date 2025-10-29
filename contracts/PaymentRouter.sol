// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PaymentRouter
 * @notice Stateless pull-based router to execute ERC-20 transfers using EIP-712 signatures.
 *         - Users pre-approve this contract once for the relevant token (e.g., USDT on Ethereum).
 *         - A facilitator (merchant/relayer) submits a signed authorization to move exactly
 *           the specified amount to the merchant address.
 *         - The contract never holds funds; it only calls token.transferFrom.
 *
 * Security properties:
 *  - Strict EIP-712 domain separation (name, version, chainId, verifyingContract)
 *  - Per-signer sequential nonces prevent signature replay
 *  - Deadlines prevent use after expiration
 */
contract PaymentRouter {
    // EIP-712 domain separator for this contract instance
    bytes32 public immutable DOMAIN_SEPARATOR;

    // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    bytes32 private constant _EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    // keccak256("Transfer(address token,address from,address to,uint256 amount,uint256 nonce,uint256 deadline)")
    bytes32 public constant TRANSFER_TYPEHASH = keccak256(
        "Transfer(address token,address from,address to,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    // Per-signer sequential nonces
    mapping(address => uint256) public nonces;

    event PaymentExecuted(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        uint256 nonce
    );

    constructor() {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                _EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("PaymentRouter")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
    }

    /**
     * @notice Execute a gasless transfer based on an EIP-712 signature from `from`.
     * @param token    ERC-20 token address
     * @param from     Payer address (must have approved this router for `amount`)
     * @param to       Merchant (recipient) address
     * @param amount   Amount in token's smallest units (e.g., 6 decimals for USDT)
     * @param deadline Timestamp (unix seconds) after which the auth is invalid
     * @param v        Sig v
     * @param r        Sig r
     * @param s        Sig s
     */
    function gaslessTransfer(
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "Payment authorization expired");

        uint256 currentNonce = nonces[from];
        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_TYPEHASH,
                token,
                from,
                to,
                amount,
                currentNonce,
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == from && signer != address(0), "Invalid signature");

        // Consume nonce before external call
        nonces[from] = currentNonce + 1;

        require(IERC20(token).transferFrom(from, to, amount), "Token transfer failed");

        emit PaymentExecuted(from, to, token, amount, currentNonce);
    }
}


