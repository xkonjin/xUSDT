"""
Toy NFT Minter Module

This module handles minting of toy NFTs with rarity rolls and stat generation.
Integrates with the existing PlasmaMinter and game database to create unique toy NFTs
with randomized rarity tiers and stats based on toy type templates.

Each toy type has a maximum of 10 mints for scarcity. Rarity distribution:
- Common: 60%
- Rare: 25%
- Epic: 10%
- Legendary: 5%

Stats are generated based on toy type stat categories and rarity multipliers.
"""

from __future__ import annotations

import random
import json
from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime

from .minter import PlasmaMinter, MintResult
from .game_db import GameDatabase, Toy, NFTToy, Player
from .config import settings


@dataclass
class ToyMintResult:
    """
    Result of a toy NFT minting operation.
    
    Attributes:
        success: Whether the mint operation succeeded
        token_id: The token ID of the minted NFT (if successful)
        rarity: The rarity tier assigned (common, rare, epic, legendary)
        stats: Generated stats dictionary
        mint_number: Sequential mint number for this toy type (1-10)
        error: Error message if the operation failed
    """
    success: bool
    token_id: Optional[int] = None
    rarity: Optional[str] = None
    stats: Optional[Dict[str, int]] = None
    mint_number: Optional[int] = None
    error: Optional[str] = None


class ToyMinter:
    """
    Toy NFT minter with rarity and stat generation.
    
    Handles:
    - Rarity roll based on toy type distribution
    - Stat generation with rarity multipliers
    - Mint limit enforcement (max 10 per toy type)
    - Database tracking of minted toys
    - NFT metadata URI generation
    """
    
    # Rarity multipliers for stat generation
    RARITY_MULTIPLIERS = {
        "common": 1.0,
        "rare": 1.5,
        "epic": 2.0,
        "legendary": 3.0,
    }
    
    # Base stat range (before rarity multiplier)
    BASE_STAT_MIN = 5
    BASE_STAT_MAX = 15
    
    def __init__(self, db: GameDatabase):
        """
        Initialize toy minter.
        
        Args:
            db: GameDatabase instance for database operations
        """
        self.db = db
        self.plasma_minter = PlasmaMinter()
    
    def roll_rarity(self, toy_type: Toy) -> str:
        """
        Roll rarity tier based on toy type distribution.
        
        Args:
            toy_type: Toy type definition with rarity distribution
        
        Returns:
            Rarity tier string: "common", "rare", "epic", or "legendary"
        """
        dist = toy_type.rarity_distribution
        roll = random.randint(1, 100)
        
        if roll <= dist["common"]:
            return "common"
        elif roll <= dist["common"] + dist["rare"]:
            return "rare"
        elif roll <= dist["common"] + dist["rare"] + dist["epic"]:
            return "epic"
        else:
            return "legendary"
    
    def generate_stats(self, toy_type: Toy, rarity: str) -> Dict[str, int]:
        """
        Generate stats for a toy based on type and rarity.
        
        Args:
            toy_type: Toy type definition with stat categories
            rarity: Rarity tier string
        
        Returns:
            Dictionary mapping stat category names to integer values
        """
        multiplier = self.RARITY_MULTIPLIERS[rarity]
        stats = {}
        
        for stat_category in toy_type.stat_categories:
            # Generate base stat value
            base_stat = random.randint(self.BASE_STAT_MIN, self.BASE_STAT_MAX)
            # Apply rarity multiplier and round
            final_stat = int(base_stat * multiplier)
            stats[stat_category] = final_stat
        
        return stats
    
    def get_next_mint_number(self, toy_type_id: int) -> int:
        """
        Get the next sequential mint number for a toy type.
        
        Args:
            toy_type_id: Toy type ID
        
        Returns:
            Next mint number (1-10)
        """
        session = self.db.get_session()
        try:
            # Count existing mints for this toy type
            count = session.query(NFTToy).filter(
                NFTToy.toy_type_id == toy_type_id
            ).count()
            
            return count + 1
        finally:
            session.close()
    
    def check_mint_limit(self, toy_type_id: int) -> tuple[bool, int]:
        """
        Check if toy type has reached mint limit.
        
        Args:
            toy_type_id: Toy type ID
        
        Returns:
            Tuple of (can_mint, current_count)
        """
        session = self.db.get_session()
        try:
            toy_type = session.query(Toy).filter(Toy.id == toy_type_id).first()
            if not toy_type:
                return False, 0
            
            current_count = session.query(NFTToy).filter(
                NFTToy.toy_type_id == toy_type_id
            ).count()
            
            can_mint = current_count < toy_type.max_mint_per_type
            return can_mint, current_count
        finally:
            session.close()
    
    def generate_metadata_uri(self, toy_type: Toy, rarity: str, stats: Dict[str, int], mint_number: int) -> str:
        """
        Generate metadata URI for NFT.
        
        In production, this would upload to IPFS. For now, returns a placeholder URI
        that can be replaced with actual IPFS hash.
        
        Args:
            toy_type: Toy type definition
            rarity: Rarity tier
            stats: Generated stats
            mint_number: Mint number
        
        Returns:
            Metadata URI string
        """
        # TODO: Upload to IPFS in production
        # For now, return a placeholder that includes all metadata
        metadata = {
            "name": f"{toy_type.name} #{mint_number}",
            "description": toy_type.description or f"A {rarity} {toy_type.name} toy",
            "image": f"https://example.com/toys/{toy_type.icon_name}.svg",
            "attributes": [
                {"trait_type": "Rarity", "value": rarity.capitalize()},
                {"trait_type": "Mint Number", "value": mint_number},
                {"trait_type": "Toy Type", "value": toy_type.name},
            ] + [
                {"trait_type": stat_name, "value": stat_value}
                for stat_name, stat_value in stats.items()
            ],
        }
        
        # In production, upload to IPFS and return hash
        # For now, return a data URI or placeholder
        return f"https://example.com/nft/metadata/{toy_type.id}/{mint_number}"
    
    def mint_toy(
        self,
        toy_type_id: int,
        owner_address: str,
        original_purchase_price: Optional[int] = None,
    ) -> ToyMintResult:
        """
        Mint a toy NFT with rarity and stats.
        
        This is the main minting function that:
        1. Checks mint limit
        2. Rolls rarity
        3. Generates stats
        4. Mints NFT on Plasma
        5. Records in database
        
        Args:
            toy_type_id: Toy type ID to mint
            owner_address: Ethereum address of the owner
            original_purchase_price: Purchase price in atomic units (for merchant buyback)
        
        Returns:
            ToyMintResult with mint details or error
        """
        session = self.db.get_session()
        
        try:
            # Get toy type
            toy_type = session.query(Toy).filter(Toy.id == toy_type_id).first()
            if not toy_type:
                return ToyMintResult(
                    success=False,
                    error=f"Toy type {toy_type_id} not found"
                )
            
            # Check mint limit
            can_mint, current_count = self.check_mint_limit(toy_type_id)
            if not can_mint:
                return ToyMintResult(
                    success=False,
                    error=f"Toy type {toy_type.name} has reached maximum mints ({toy_type.max_mint_per_type})"
                )
            
            # Roll rarity
            rarity = self.roll_rarity(toy_type)
            
            # Generate stats
            stats = self.generate_stats(toy_type, rarity)
            
            # Get next mint number
            mint_number = self.get_next_mint_number(toy_type_id)
            
            # Generate metadata URI
            metadata_uri = self.generate_metadata_uri(toy_type, rarity, stats, mint_number)
            
            # Mint NFT on Plasma
            mint_result = self.plasma_minter.mint(
                to=owner_address,
                token_uri=metadata_uri,
            )
            
            if not mint_result.success:
                return ToyMintResult(
                    success=False,
                    error=f"NFT minting failed: {mint_result.error}"
                )
            
            token_id = mint_result.token_id
            
            # Create database record
            nft_toy = NFTToy(
                token_id=token_id,
                toy_type_id=toy_type_id,
                owner_address=owner_address,
                rarity=rarity,
                stats_json=stats,
                mint_number=mint_number,
                minted_at=datetime.utcnow(),
                metadata_uri=metadata_uri,
                original_purchase_price=original_purchase_price,
            )
            
            session.add(nft_toy)
            session.commit()
            
            return ToyMintResult(
                success=True,
                token_id=token_id,
                rarity=rarity,
                stats=stats,
                mint_number=mint_number,
            )
        
        except Exception as e:
            session.rollback()
            return ToyMintResult(
                success=False,
                error=f"Minting error: {str(e)}"
            )
        finally:
            session.close()

