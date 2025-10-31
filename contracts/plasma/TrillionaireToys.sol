// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrillionaireToys
 * @notice ERC-721 collection of emoji "toys" sold on a per-toy bonding curve in USDT0 terms.
 *         - Each toy type has independent curve params: minPrice, maxPrice, growth factor (mantissa)
 *         - Token IDs encode toyId and serial: tokenId = toyId * 1_000_000 + serial
 *         - Contract stores price paid at mint and tracks per-toy leader (highest price)
 */
contract TrillionaireToys is ERC721, ERC721Enumerable, Ownable {
    struct Toy {
        uint64 toyId;            // logical id (small integer)
        uint128 minPrice;        // 6-decimal USDT0 units
        uint128 maxPrice;        // cap price (6-decimal)
        uint64 rMantissa;        // growth factor mantissa scaled by 1e6 (e.g., 1.15x -> 1_150_000)
        string baseURI;          // baseURI for metadata
    }

    // Constants
    uint256 private constant SCALE = 1_000_000; // 1e6
    uint256 private constant TOY_ID_MULTIPLIER = 1_000_000; // for token id packing

    // Curve config by toy
    mapping(uint64 => Toy) public toys;
    mapping(uint64 => uint256) public mintedCount; // per-toy minted count (serial starts at 0)

    // Mint records
    mapping(uint256 => uint256) public priceAtMint; // tokenId -> price paid (6 decimals)

    // Per-toy leaderboard
    mapping(uint64 => address) public leaderOwner;
    mapping(uint64 => uint256) public leaderPrice;
    mapping(uint64 => uint256) public leaderTokenId;

    // Simple minter role (server/backend)
    address public minter;

    event ToyConfigured(uint64 indexed toyId, uint128 minPrice, uint128 maxPrice, uint64 rMantissa, string baseURI);
    event Minted(uint64 indexed toyId, uint256 indexed tokenId, uint256 version, uint256 pricePaid, address indexed to);
    event MinterUpdated(address indexed newMinter);

    constructor() ERC721("Trillionaire Toys", "TT") {}

    // --- Admin ---
    function setMinter(address newMinter) external onlyOwner {
        minter = newMinter;
        emit MinterUpdated(newMinter);
    }

    function configureToy(
        uint64 toyId,
        uint128 minPrice,
        uint128 maxPrice,
        uint64 rMantissa,
        string calldata baseURI
    ) external onlyOwner {
        require(toyId > 0, "toyId=0");
        require(minPrice > 0 && maxPrice >= minPrice, "bad price range");
        require(rMantissa >= SCALE + 1, "r too small");
        toys[toyId] = Toy({ toyId: toyId, minPrice: minPrice, maxPrice: maxPrice, rMantissa: rMantissa, baseURI: baseURI });
        emit ToyConfigured(toyId, minPrice, maxPrice, rMantissa, baseURI);
    }

    // --- Views ---
    function currentPrice(uint64 toyId) public view returns (uint256) {
        Toy memory t = toys[toyId];
        require(t.toyId != 0, "unknown toy");
        uint256 supply = mintedCount[toyId];
        uint256 factorPow = _powMantissa(t.rMantissa, supply);
        // price = min(minPrice * r^supply, maxPrice)
        uint256 price = (uint256(t.minPrice) * factorPow) / _powMantissa(SCALE, supply);
        if (price > t.maxPrice) price = t.maxPrice;
        if (price < t.minPrice) price = t.minPrice;
        return price;
    }

    function tokenToyId(uint256 tokenId) public pure returns (uint64) {
        return uint64(tokenId / TOY_ID_MULTIPLIER);
    }

    function tokenVersion(uint256 tokenId) public pure returns (uint256) {
        return uint256(tokenId % TOY_ID_MULTIPLIER);
    }

    function getLeader(uint64 toyId) external view returns (address owner_, uint256 price_, uint256 tokenId_) {
        return (leaderOwner[toyId], leaderPrice[toyId], leaderTokenId[toyId]);
    }

    // --- Mint ---
    function mintTo(
        address to,
        uint64 toyId,
        uint256 quotedPrice,
        uint256 deadline,
        bytes calldata memoSig // reserved for future auth linkage
    ) external {
        require(msg.sender == owner() || msg.sender == minter, "not authorized");
        require(block.timestamp <= deadline, "quote expired");
        uint256 price = currentPrice(toyId);
        require(quotedPrice == price, "price changed");

        uint256 serial = mintedCount[toyId];
        uint256 tokenId = uint256(toyId) * TOY_ID_MULTIPLIER + serial;
        mintedCount[toyId] = serial + 1;

        _safeMint(to, tokenId);
        priceAtMint[tokenId] = price;

        // update leader if needed
        if (price > leaderPrice[toyId]) {
            leaderPrice[toyId] = price;
            leaderOwner[toyId] = to;
            leaderTokenId[toyId] = tokenId;
        }

        emit Minted(toyId, tokenId, serial, price, to);
    }

    // --- Internals ---
    function _powMantissa(uint256 aMantissa, uint256 e) internal pure returns (uint256) {
        // exponentiation by squaring on 1e6 mantissa
        uint256 result = SCALE;
        uint256 base = aMantissa;
        uint256 exp = e;
        while (exp > 0) {
            if (exp & 1 == 1) {
                result = (result * base) / SCALE;
            }
            base = (base * base) / SCALE;
            exp >>= 1;
        }
        return result;
    }

    // --- ERC721 overrides ---
    function _baseURI() internal view override returns (string memory) {
        // Base URI varies per toy; frontends often compute tokenURI off-chain based on toy baseURI + tokenId
        // We return empty to defer to external metadata services.
        return "";
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
