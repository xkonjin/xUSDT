// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IEIP3009 {
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external;
}

interface IReceipt721 {
    function safeMint(address to) external returns (uint256);
}

/**
 * @title MerchantNFTRouter
 * @notice Router that atomically accepts EIP-3009 authorization for USDT₀ payments
 *         and mints a single ERC-721 receipt NFT when the configured price is met.
 */
contract MerchantNFTRouter is Ownable {
    address public immutable token;    // USDT₀ token address
    address public immutable nft;      // PlasmaReceipt721 address
    address public immutable treasury; // Merchant receiving USDT₀
    uint256 public immutable price;    // Price in token units (6 decimals) e.g., 10_000 = 0.01

    event PaidAndMinted(address indexed payer, address indexed toNFT, uint256 value);

    constructor(address _token, address _nft, address _treasury, uint256 _price) Ownable() {
        require(_token != address(0) && _nft != address(0) && _treasury != address(0), "zero addr");
        require(_price > 0, "price=0");
        token = _token;
        nft = _nft;
        treasury = _treasury;
        price = _price;
    }

    // EIP-3009 bytes-signature variant
    function payAndMintReceiveAuth(
        address from,
        address toNFT,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        require(value == price, "wrong price");
        IEIP3009(token).receiveWithAuthorization(from, address(this), value, validAfter, validBefore, nonce, signature);
        // forward funds to treasury
        require(IERC20(token).transfer(treasury, value), "transfer fail");
        IReceipt721(nft).safeMint(toNFT);
        emit PaidAndMinted(from, toNFT, value);
    }

    // EIP-3009 v/r/s variant
    function payAndMintVRS(
        address from,
        address toNFT,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(value == price, "wrong price");
        IEIP3009(token).transferWithAuthorization(from, treasury, value, validAfter, validBefore, nonce, v, r, s);
        IReceipt721(nft).safeMint(toNFT);
        emit PaidAndMinted(from, toNFT, value);
    }
}


