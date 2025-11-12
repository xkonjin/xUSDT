"""
Marketplace Service

Handles toy marketplace operations including:
- Listing toys for sale
- Purchasing listed toys
- Merchant buyback (90% of purchase price)
- Dynamic pricing based on rarity and scarcity
- Fee collection (1% of sale price goes to prize pool)
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, Depends
from pydantic import BaseModel, Field

from .game_db import (
    GameDatabase,
    NFTToy,
    Player,
    MarketplaceListing,
    MarketplaceSale,
    Toy,
)
from .facilitator import PaymentFacilitator
from .config import settings


class ListToyRequest(BaseModel):
    """Request to list a toy for sale."""
    token_id: int
    price_usdt0: int  # Price in atomic units (6 decimals)


class PurchaseListingRequest(BaseModel):
    """Request to purchase a listed toy."""
    listing_id: int
    payment: dict  # Payment via x402 flow (PaymentSubmitted)


class MarketplaceListingInfo(BaseModel):
    """Marketplace listing information."""
    listing_id: int
    token_id: int
    toy_name: str
    rarity: str
    stats: Dict[str, int]
    seller_address: str
    price_usdt0: int
    price_usdt0_readable: float
    listed_at: datetime


def calculate_dynamic_price(
    toy_type: Toy,
    nft_toy: NFTToy,
    current_mint_count: int,
) -> int:
    """
    Calculate dynamic price for a toy based on rarity and scarcity.
    
    Args:
        toy_type: Toy type definition
        nft_toy: NFT toy instance
        current_mint_count: Current number of mints for this toy type
    
    Returns:
        Suggested price in atomic units
    """
    base_price = toy_type.base_price_usdt0
    
    # Rarity multiplier
    rarity_multipliers = {
        "common": 1.0,
        "rare": 1.5,
        "epic": 2.0,
        "legendary": 3.0,
    }
    rarity_mult = rarity_multipliers.get(nft_toy.rarity, 1.0)
    
    # Scarcity multiplier (fewer remaining = higher price)
    remaining = toy_type.max_mint_per_type - current_mint_count
    scarcity_mult = 1.0 + (remaining / toy_type.max_mint_per_type) * 0.5  # Up to 1.5x
    
    # Stat multiplier (higher stats = higher price)
    total_stats = sum(nft_toy.stats_json.values())
    avg_stat = total_stats / len(nft_toy.stats_json) if nft_toy.stats_json else 10
    stat_mult = 1.0 + (avg_stat / 50) * 0.3  # Up to 1.3x
    
    dynamic_price = int(base_price * rarity_mult * scarcity_mult * stat_mult)
    
    return dynamic_price


def list_toy_for_sale(
    token_id: int,
    seller_address: str,
    price_usdt0: int,
    db: GameDatabase,
) -> MarketplaceListingInfo:
    """
    List a toy for sale on the marketplace.
    
    Args:
        token_id: NFT token ID
        seller_address: Seller wallet address
        price_usdt0: Listing price in atomic units
        db: Database instance
    
    Returns:
        MarketplaceListingInfo
    """
    session = db.get_session()
    
    try:
        # Verify ownership
        nft_toy = session.query(NFTToy).filter(
            NFTToy.token_id == token_id
        ).first()
        
        if not nft_toy:
            raise HTTPException(status_code=404, detail="Toy not found")
        
        if nft_toy.owner_address.lower() != seller_address.lower():
            raise HTTPException(status_code=403, detail="Not the owner of this toy")
        
        # Check if already listed
        existing = session.query(MarketplaceListing).filter(
            MarketplaceListing.token_id == token_id,
            MarketplaceListing.status == "active",
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Toy already listed")
        
        # Check if equipped (must unequip first)
        from .game_db import PlayerInventory
        equipped = session.query(PlayerInventory).filter(
            PlayerInventory.token_id == token_id
        ).first()
        
        if equipped:
            raise HTTPException(
                status_code=400,
                detail="Cannot list equipped toy. Unequip it first."
            )
        
        # Create listing
        listing = MarketplaceListing(
            token_id=token_id,
            seller_address=seller_address,
            price_usdt0=price_usdt0,
            listed_at=datetime.utcnow(),
            status="active",
        )
        
        session.add(listing)
        session.commit()
        session.refresh(listing)
        
        toy_type = session.query(Toy).filter(
            Toy.id == nft_toy.toy_type_id
        ).first()
        
        return MarketplaceListingInfo(
            listing_id=listing.listing_id,
            token_id=token_id,
            toy_name=toy_type.name if toy_type else "Unknown",
            rarity=nft_toy.rarity,
            stats=nft_toy.stats_json,
            seller_address=seller_address,
            price_usdt0=price_usdt0,
            price_usdt0_readable=price_usdt0 / 1_000_000,
            listed_at=listing.listed_at,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to list toy: {str(e)}")
    finally:
        session.close()


def purchase_listing(
    listing_id: int,
    buyer_address: str,
    payment_completed: dict,
    db: GameDatabase,
) -> Dict[str, Any]:
    """
    Purchase a listed toy.
    
    Args:
        listing_id: Listing ID
        buyer_address: Buyer wallet address
        payment_completed: Payment completion data
        db: Database instance
    
    Returns:
        Sale information
    """
    session = db.get_session()
    
    try:
        # Get listing
        listing = session.query(MarketplaceListing).filter(
            MarketplaceListing.listing_id == listing_id,
            MarketplaceListing.status == "active",
        ).first()
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing.seller_address.lower() == buyer_address.lower():
            raise HTTPException(status_code=400, detail="Cannot buy your own listing")
        
        # Get NFT toy
        nft_toy = session.query(NFTToy).filter(
            NFTToy.token_id == listing.token_id
        ).first()
        
        if not nft_toy:
            raise HTTPException(status_code=404, detail="Toy not found")
        
        # Calculate fee (1% of sale price)
        fee_usdt0 = listing.price_usdt0 // 100
        seller_receives = listing.price_usdt0 - fee_usdt0
        
        # Update NFT ownership
        nft_toy.owner_address = buyer_address
        
        # Mark listing as sold
        listing.status = "sold"
        
        # Create sale record
        sale = MarketplaceSale(
            listing_id=listing_id,
            buyer_address=buyer_address,
            seller_address=listing.seller_address,
            price_usdt0=listing.price_usdt0,
            fee_usdt0=fee_usdt0,
            tx_hash=payment_completed.get("txHash"),
            timestamp=datetime.utcnow(),
        )
        
        session.add(sale)
        session.commit()
        
        return {
            "success": True,
            "sale_id": sale.sale_id,
            "token_id": listing.token_id,
            "buyer_address": buyer_address,
            "seller_address": listing.seller_address,
            "price_usdt0": listing.price_usdt0,
            "fee_usdt0": fee_usdt0,
            "seller_receives_usdt0": seller_receives,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Purchase failed: {str(e)}")
    finally:
        session.close()


def sell_to_merchant(
    token_id: int,
    seller_address: str,
    db: GameDatabase,
) -> Dict[str, Any]:
    """
    Sell toy back to merchant at 90% of original purchase price.
    
    Args:
        token_id: NFT token ID
        seller_address: Seller wallet address
        db: Database instance
    
    Returns:
        Sale information
    """
    session = db.get_session()
    
    try:
        # Get NFT toy
        nft_toy = session.query(NFTToy).filter(
            NFTToy.token_id == token_id
        ).first()
        
        if not nft_toy:
            raise HTTPException(status_code=404, detail="Toy not found")
        
        if nft_toy.owner_address.lower() != seller_address.lower():
            raise HTTPException(status_code=403, detail="Not the owner")
        
        # Check if equipped
        from .game_db import PlayerInventory
        equipped = session.query(PlayerInventory).filter(
            PlayerInventory.token_id == token_id
        ).first()
        
        if equipped:
            raise HTTPException(
                status_code=400,
                detail="Cannot sell equipped toy. Unequip it first."
            )
        
        # Calculate buyback price (90% of original)
        if nft_toy.original_purchase_price:
            buyback_price = int(nft_toy.original_purchase_price * 0.9)
        else:
            # Fallback to toy type base price * 0.9
            toy_type = session.query(Toy).filter(
                Toy.id == nft_toy.toy_type_id
            ).first()
            if toy_type:
                buyback_price = int(toy_type.base_price_usdt0 * 0.9)
            else:
                raise HTTPException(status_code=400, detail="Cannot determine buyback price")
        
        # Transfer USDT0 to seller (via facilitator)
        facilitator = PaymentFacilitator()
        # TODO: Implement merchant buyback payment
        
        # Transfer NFT to merchant address
        nft_toy.owner_address = settings.MERCHANT_ADDRESS
        
        session.commit()
        
        return {
            "success": True,
            "token_id": token_id,
            "buyback_price_usdt0": buyback_price,
            "buyback_price_readable": buyback_price / 1_000_000,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Merchant buyback failed: {str(e)}")
    finally:
        session.close()

