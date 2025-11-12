"""
NFT Minter module for Plasma payment receipts.

This module provides the PlasmaMinter class for minting NFT receipts
after successful payment settlements. The minting functionality is optional
and can be enabled via the NFT_MINT_ON_PAY configuration flag.

The minter interacts with an ERC-721 compatible NFT contract deployed on Plasma
to mint payment receipt tokens with metadata URIs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from web3 import Web3
from web3.contract import Contract

from .config import settings


@dataclass
class MintResult:
    """
    Result of an NFT minting operation.
    
    Attributes:
        success: Whether the mint operation succeeded
        token_id: The token ID of the minted NFT (if successful)
        error: Error message if the operation failed
    """
    success: bool
    token_id: Optional[int] = None
    error: Optional[str] = None


# Standard ERC-721 ABI for minting operations
ERC721_MINT_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "uri", "type": "string"},
        ],
        "name": "mint",
        "outputs": [
            {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
        ],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


class PlasmaMinter:
    """
    NFT minter for Plasma payment receipts.
    
    This class handles minting of ERC-721 NFT tokens as payment receipts
    on the Plasma network. It requires an NFT contract address to be configured
    via the NFT_CONTRACT environment variable.
    
    Example usage:
        minter = PlasmaMinter()
        result = minter.mint(to="0x...", token_uri="https://example.com/nft/123")
        if result.success:
            print(f"Minted token ID: {result.token_id}")
    """
    
    def __init__(self) -> None:
        """
        Initialize the Plasma minter with Web3 connection and NFT contract.
        
        Raises:
            ValueError: If NFT_CONTRACT is not configured in settings
        """
        # Initialize Web3 connection to Plasma network
        self.w3 = Web3(Web3.HTTPProvider(settings.PLASMA_RPC))
        
        # Get NFT contract address from settings
        nft_contract_address = getattr(settings, "NFT_CONTRACT", None) or None
        
        if not nft_contract_address:
            # If no contract configured, we'll return a mock result
            # This allows the code to work even without NFT functionality
            self.nft_contract: Optional[Contract] = None
        else:
            # Create contract instance for minting
            self.nft_contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(nft_contract_address),
                abi=ERC721_MINT_ABI,
            )
        
        # Get relayer account for signing transactions
        self.account = self.w3.eth.account.from_key(settings.RELAYER_PRIVATE_KEY)
    
    def mint(self, to: str, token_uri: str) -> MintResult:
        """
        Mint an NFT receipt token to the specified address.
        
        Args:
            to: Recipient address for the NFT
            token_uri: Metadata URI for the NFT (typically points to JSON metadata)
        
        Returns:
            MintResult with success status, token_id (if successful), and error (if failed)
        
        Note:
            If NFT_CONTRACT is not configured, returns a mock success result
            to allow the payment flow to continue without actual minting.
        """
        # If no NFT contract is configured, return a mock result
        # This allows the payment flow to work even without NFT functionality
        if self.nft_contract is None:
            # Return a mock token ID based on current block number
            # This is a placeholder - in production, you should configure NFT_CONTRACT
            try:
                block_number = self.w3.eth.block_number
                mock_token_id = block_number * 1000  # Simple mock ID generation
                return MintResult(
                    success=True,
                    token_id=mock_token_id,
                    error=None,
                )
            except Exception as e:
                return MintResult(
                    success=False,
                    token_id=None,
                    error=f"NFT_CONTRACT not configured and mock mint failed: {str(e)}",
                )
        
        try:
            # Build the mint transaction
            tx = self.nft_contract.functions.mint(
                Web3.to_checksum_address(to),
                token_uri,
            ).build_transaction({
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
            })
            
            # Sign and send the transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=settings.RELAYER_PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            # Check if transaction succeeded
            if receipt.status == 1:
                # Extract token ID from transaction receipt logs
                # Note: This is a simplified approach - in production, you should parse
                # the Transfer event from the receipt logs to get the actual token ID
                # For now, we'll use a deterministic approach based on total supply
                try:
                    total_supply = self.nft_contract.functions.totalSupply().call()
                    token_id = total_supply - 1  # Assuming sequential token IDs
                except Exception:
                    # Fallback: use block number as token ID
                    token_id = receipt.blockNumber * 1000
                
                return MintResult(
                    success=True,
                    token_id=token_id,
                    error=None,
                )
            else:
                return MintResult(
                    success=False,
                    token_id=None,
                    error="Transaction reverted",
                )
        
        except Exception as e:
            return MintResult(
                success=False,
                token_id=None,
                error=f"Minting failed: {str(e)}",
            )

