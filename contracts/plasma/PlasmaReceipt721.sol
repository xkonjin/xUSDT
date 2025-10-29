// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title PlasmaReceipt721
 * @notice Minimal ERC-721 that mints a "Smiley" NFT on successful payment.
 *         - Only the configured minter (router) can mint.
 *         - tokenURI returns a data: URI embedding a simple SVG smiley.
 */
contract PlasmaReceipt721 is ERC721, Ownable {
    using Strings for uint256;

    address public minter;
    uint256 public nextTokenId = 1;

    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event Minted(address indexed to, uint256 indexed tokenId);

    constructor() ERC721("Smiley Receipt", "SMILE") Ownable() {}

    function setMinter(address newMinter) external onlyOwner {
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    function safeMint(address to) external returns (uint256 tokenId) {
        require(msg.sender == minter, "Only minter");
        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        emit Minted(to, tokenId);
    }

    function tokenURI(uint256 /*tokenId*/) public pure override returns (string memory) {
        // Simple yellow smiley SVG as data URI
        string memory svg =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
            '<circle cx="50" cy="50" r="45" fill="#FFD93B" stroke="#000"/>'
            '<circle cx="35" cy="40" r="6" fill="#000"/>'
            '<circle cx="65" cy="40" r="6" fill="#000"/>'
            '<path d="M30 60 Q50 80 70 60" stroke="#000" stroke-width="5" fill="transparent"/>'
            '</svg>';
        string memory header = "data:image/svg+xml;utf8,";
        return string(abi.encodePacked(header, svg));
    }
}


