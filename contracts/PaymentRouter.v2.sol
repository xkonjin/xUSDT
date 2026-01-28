
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PaymentRouter is EIP712 {
    bytes32 private constant _PAYMENT_TYPEHASH = keccak256("Payment(address token,address merchant,uint256 amount,bytes32 invoiceId,uint256 nonce,uint256 deadline)");

    mapping(address => uint256) public nonces;

    event PaymentReceived(
        bytes32 indexed invoiceId,
        address indexed merchant,
        address indexed payer,
        address token,
        uint256 amount,
        uint256 timestamp
    );

    constructor() EIP712("PaymentRouter", "1") {}

    function pay(
        address token,
        address merchant,
        uint256 amount,
        bytes32 invoiceId,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "PaymentRouter: payment has expired");
        require(merchant != address(0), "PaymentRouter: merchant cannot be zero address");
        require(amount > 0, "PaymentRouter: amount must be greater than zero");

        uint256 nonce = nonces[msg.sender]++;
        bytes32 structHash = keccak256(
            abi.encode(
                _PAYMENT_TYPEHASH,
                token,
                merchant,
                amount,
                invoiceId,
                nonce,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        require(signer == msg.sender, "PaymentRouter: invalid signature");

        IERC20(token).transferFrom(msg.sender, merchant, amount);

        emit PaymentReceived(invoiceId, merchant, msg.sender, token, amount, block.timestamp);
    }
}
