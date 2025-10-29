// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title NFTPlasma
/// @notice Minimal ERC-721 for minting NFTs to buyers on Plasma L1 after successful payment.
contract NFTPlasma is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event Minted(address indexed to, uint256 indexed tokenId, string uri);

    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC721(name_, symbol_)
        Ownable()
    {
        if (initialOwner != address(0)) {
            _transferOwnership(initialOwner);
        }
    }

    /// @notice Mint a new token to `to` with explicit `tokenUri`.
    /// Only callable by the contract owner (merchant/relayer key).
    function safeMint(address to, string memory tokenUri) external onlyOwner returns (uint256 tokenId) {
        unchecked {
            tokenId = ++_nextTokenId;
        }
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);
        emit Minted(to, tokenId, tokenUri);
    }
}
