"""
Game Service API

FastAPI service for the Trillionaire Toy Store Game.
Handles toy purchases, NFT minting, player registration, and game state management.

This service extends the existing merchant_service.py with game-specific endpoints.
"""

from __future__ import annotations

import time
import hashlib
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .merchant_agent import build_payment_required, verify_and_settle
from .x402_models import PaymentSubmitted, PaymentRequired
from .config import settings
from .game_db import (
    GameDatabase,
    Toy,
    NFTToy,
    Player,
    PlayerInventory,
    DailyBonus,
    GameSession,
    Leaderboard,
    MarketplaceListing,
    MarketplaceSale,
    WeeklyPrize,
    get_week_id,
)
from .marketplace_service import (
    list_toy_for_sale,
    purchase_listing,
    sell_to_merchant,
    calculate_dynamic_price,
)
from .toy_minter import ToyMinter, ToyMintResult
import uuid

# Initialize database connection
_db_instance: Optional[GameDatabase] = None


def get_db() -> GameDatabase:
    """Get database instance (singleton pattern)."""
    global _db_instance
    if _db_instance is None:
        if not settings.GAME_DATABASE_URL:
            raise ValueError("GAME_DATABASE_URL must be configured")
        _db_instance = GameDatabase(settings.GAME_DATABASE_URL)
        _db_instance.create_tables()
    return _db_instance


def get_db_session(db: GameDatabase = Depends(get_db)) -> Session:
    """Get database session."""
    return db.get_session()


# Pydantic models for API requests/responses
class PurchaseToyRequest(BaseModel):
    """Request to purchase a toy."""
    toy_type_id: int
    payment: PaymentSubmitted  # Payment via x402 flow


class PurchaseToyResponse(BaseModel):
    """Response after successful toy purchase."""
    success: bool
    token_id: Optional[int] = None
    rarity: Optional[str] = None
    stats: Optional[Dict[str, int]] = None
    mint_number: Optional[int] = None
    error: Optional[str] = None


class RegisterPlayerRequest(BaseModel):
    """Request to register a new player."""
    wallet_address: str
    nickname: Optional[str] = Field(None, min_length=3, max_length=20)


class PlayerInfo(BaseModel):
    """Player information response."""
    wallet_address: str
    nickname: Optional[str]
    credits_balance: int
    total_points: int
    games_played: int


class ToyInfo(BaseModel):
    """Toy information response."""
    token_id: int
    toy_type_id: int
    toy_name: str
    rarity: str
    stats: Dict[str, int]
    mint_number: int
    owner_address: str


# Create game service app (separate from merchant service for organization)
game_app = FastAPI(title="Trillionaire Toy Store Game API")


@game_app.get("/health")
def game_health() -> dict:
    """Health check endpoint."""
    return {"ok": True, "ts": int(time.time()), "service": "game"}


@game_app.get("/toys")
def list_toys(db: GameDatabase = Depends(get_db)) -> List[Dict[str, Any]]:
    """
    List all available toy types with current mint counts.
    
    Returns list of toys with:
    - id, name, description, base_price_usdt0
    - icon_name, stat_categories
    - current_mint_count, max_mint_per_type
    - available (can still be minted)
    """
    session = db.get_session()
    try:
        toys = session.query(Toy).all()
        result = []
        
        for toy in toys:
            # Count current mints
            mint_count = session.query(NFTToy).filter(
                NFTToy.toy_type_id == toy.id
            ).count()
            
            result.append({
                "id": toy.id,
                "name": toy.name,
                "description": toy.description,
                "base_price_usdt0": toy.base_price_usdt0,
                "price_usdt0": toy.base_price_usdt0 / 1_000_000,  # Human-readable
                "icon_name": toy.icon_name,
                "stat_categories": toy.stat_categories,
                "rarity_distribution": toy.rarity_distribution,
                "current_mint_count": mint_count,
                "max_mint_per_type": toy.max_mint_per_type,
                "available": mint_count < toy.max_mint_per_type,
            })
        
        return result
    finally:
        session.close()


@game_app.get("/toys/{toy_type_id}/invoice")
def get_toy_invoice(toy_type_id: int, db: GameDatabase = Depends(get_db)) -> JSONResponse:
    """
    Get payment invoice for purchasing a toy.
    
    Returns 402 PaymentRequired with toy price.
    """
    session = db.get_session()
    try:
        toy = session.query(Toy).filter(Toy.id == toy_type_id).first()
        if not toy:
            raise HTTPException(status_code=404, detail=f"Toy type {toy_type_id} not found")
        
        # Check if toy is still available
        mint_count = session.query(NFTToy).filter(
            NFTToy.toy_type_id == toy_type_id
        ).count()
        
        if mint_count >= toy.max_mint_per_type:
            raise HTTPException(
                status_code=400,
                detail=f"Toy type {toy.name} has reached maximum mints ({toy.max_mint_per_type})"
            )
        
        # Build payment required
        pr = build_payment_required(
            amount_atomic=toy.base_price_usdt0,
            description=f"Purchase {toy.name} toy",
            deadline_secs=600,
        )
        
        return JSONResponse(content=pr.model_dump(), status_code=402)
    finally:
        session.close()


@game_app.post("/toys/purchase")
def purchase_toy(
    request: PurchaseToyRequest,
    db: GameDatabase = Depends(get_db),
) -> PurchaseToyResponse:
    """
    Purchase a toy after payment is completed.
    
    This endpoint:
    1. Verifies payment via x402 flow
    2. Mints NFT toy with rarity and stats
    3. Records purchase in database
    
    Returns toy NFT details.
    """
    session = db.get_session()
    
    try:
        # Verify payment
        completed = verify_and_settle(request.payment)
        
        if completed.status != "confirmed":
            return PurchaseToyResponse(
                success=False,
                error=f"Payment not confirmed: {completed.status}",
            )
        
        # Get toy type
        toy = session.query(Toy).filter(Toy.id == request.toy_type_id).first()
        if not toy:
            return PurchaseToyResponse(
                success=False,
                error=f"Toy type {request.toy_type_id} not found",
            )
        
        # Get owner address from payment
        owner_address = request.payment.chosenOption.from_
        purchase_price = int(request.payment.chosenOption.amount)
        
        # Mint toy NFT
        minter = ToyMinter(db)
        mint_result = minter.mint_toy(
            toy_type_id=request.toy_type_id,
            owner_address=owner_address,
            original_purchase_price=purchase_price,
        )
        
        if not mint_result.success:
            return PurchaseToyResponse(
                success=False,
                error=mint_result.error,
            )
        
        # Register or update player
        player = session.query(Player).filter(
            Player.wallet_address == owner_address
        ).first()
        
        if not player:
            player = Player(
                wallet_address=owner_address,
                credits_balance=100,  # Initial credits
                total_points=0,
                games_played=0,
            )
            session.add(player)
        else:
            player.last_active_at = datetime.utcnow()
        
        session.commit()
        
        return PurchaseToyResponse(
            success=True,
            token_id=mint_result.token_id,
            rarity=mint_result.rarity,
            stats=mint_result.stats,
            mint_number=mint_result.mint_number,
        )
    
    except Exception as e:
        session.rollback()
        return PurchaseToyResponse(
            success=False,
            error=f"Purchase failed: {str(e)}",
        )
    finally:
        session.close()


@game_app.post("/players/register")
def register_player(
    request: RegisterPlayerRequest,
    db: GameDatabase = Depends(get_db),
) -> PlayerInfo:
    """
    Register a new player or update nickname.
    
    Creates player record if doesn't exist, or updates nickname if exists.
    """
    session = db.get_session()
    
    try:
        player = session.query(Player).filter(
            Player.wallet_address == request.wallet_address
        ).first()
        
        if player:
            # Update nickname if provided
            if request.nickname:
                # Check nickname uniqueness
                existing = session.query(Player).filter(
                    Player.nickname == request.nickname,
                    Player.wallet_address != request.wallet_address,
                ).first()
                
                if existing:
                    raise HTTPException(
                        status_code=400,
                        detail="Nickname already taken"
                    )
                
                player.nickname = request.nickname
                player.last_active_at = datetime.utcnow()
        else:
            # Create new player
            player = Player(
                wallet_address=request.wallet_address,
                nickname=request.nickname,
                credits_balance=100,  # Initial credits
                total_points=0,
                games_played=0,
            )
            session.add(player)
        
        session.commit()
        session.refresh(player)
        
        return PlayerInfo(
            wallet_address=player.wallet_address,
            nickname=player.nickname,
            credits_balance=player.credits_balance,
            total_points=player.total_points,
            games_played=player.games_played,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        session.close()


@game_app.get("/players/{wallet_address}")
def get_player(
    wallet_address: str,
    db: GameDatabase = Depends(get_db),
) -> PlayerInfo:
    """Get player information."""
    session = db.get_session()
    try:
        player = session.query(Player).filter(
            Player.wallet_address == wallet_address
        ).first()
        
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        return PlayerInfo(
            wallet_address=player.wallet_address,
            nickname=player.nickname,
            credits_balance=player.credits_balance,
            total_points=player.total_points,
            games_played=player.games_played,
        )
    finally:
        session.close()


@game_app.get("/players/{wallet_address}/toys")
def get_player_toys(
    wallet_address: str,
    db: GameDatabase = Depends(get_db),
) -> List[ToyInfo]:
    """Get all toys owned by a player."""
    session = db.get_session()
    try:
        nft_toys = session.query(NFTToy).filter(
            NFTToy.owner_address == wallet_address
        ).all()
        
        result = []
        for nft_toy in nft_toys:
            toy_type = session.query(Toy).filter(
                Toy.id == nft_toy.toy_type_id
            ).first()
            
            result.append(ToyInfo(
                token_id=nft_toy.token_id,
                toy_type_id=nft_toy.toy_type_id,
                toy_name=toy_type.name if toy_type else "Unknown",
                rarity=nft_toy.rarity,
                stats=nft_toy.stats_json,
                mint_number=nft_toy.mint_number,
                owner_address=nft_toy.owner_address,
            ))
        
        return result
    finally:
        session.close()


@game_app.get("/daily-bonuses")
def get_daily_bonuses(
    target_date: Optional[date] = None,
    db: GameDatabase = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get daily bonuses for a specific date (defaults to today).
    
    Returns list of toy types with their daily bonuses.
    """
    if target_date is None:
        target_date = date.today()
    
    session = db.get_session()
    try:
        bonuses = session.query(DailyBonus).filter(
            DailyBonus.date == target_date
        ).all()
        
        result = []
        for bonus in bonuses:
            toy_type = session.query(Toy).filter(
                Toy.id == bonus.toy_type_id
            ).first()
            
            result.append({
                "toy_type_id": bonus.toy_type_id,
                "toy_name": toy_type.name if toy_type else "Unknown",
                "multiplier": float(bonus.multiplier),
                "bonus_type": bonus.bonus_type,
            })
        
        return result
    finally:
        session.close()


# Wagering system endpoints
class StartGameRequest(BaseModel):
    """Request to start a game with wager."""
    game_type: str
    wager_type: str  # "toy", "usdt0", or "credits"
    wager_amount: Optional[int] = None  # For USDT0 (atomic) or credits
    wager_token_id: Optional[int] = None  # For toy NFT wager
    difficulty: int = Field(1, ge=1, le=5)


class StartGameResponse(BaseModel):
    """Response with game challenge."""
    challenge_id: str
    game_type: str
    seed: int
    difficulty: int
    challenge_data: Dict[str, Any]  # Game-specific challenge data


class SubmitGameResultRequest(BaseModel):
    """Request to submit game result."""
    challenge_id: str
    result: Dict[str, Any]  # Game-specific result data


class SubmitGameResultResponse(BaseModel):
    """Response after game result submission."""
    success: bool
    points_earned: int
    validation_passed: bool
    error: Optional[str] = None


@game_app.post("/games/start")
def start_game(
    request: StartGameRequest,
    db: GameDatabase = Depends(get_db),
) -> StartGameResponse:
    """
    Start a game with wager.
    
    Validates wager, locks resources if needed, and generates game challenge.
    """
    from .games.game_engine import get_game_engine
    
    session = db.get_session()
    engine = get_game_engine()
    
    try:
        # TODO: Validate wager based on type
        # - For toy: Check ownership and lock
        # - For USDT0: Validate payment signature
        # - For credits: Check balance and deduct
        
        # Generate challenge
        challenge = engine.generate_challenge(
            game_type=request.game_type,
            difficulty=request.difficulty,
        )
        
        return StartGameResponse(
            challenge_id=challenge.challenge_id,
            game_type=challenge.game_type,
            seed=challenge.seed,
            difficulty=challenge.difficulty,
            challenge_data=challenge.expected_result,
        )
    finally:
        session.close()


@game_app.post("/games/submit")
def submit_game_result(
    request: SubmitGameResultRequest,
    wallet_address: str,  # From auth/header
    db: GameDatabase = Depends(get_db),
) -> SubmitGameResultResponse:
    """
    Submit game result for validation and point calculation.
    
    Validates result server-side, calculates points with multipliers,
    and updates player stats.
    """
    from .games.game_engine import get_game_engine
    
    session = db.get_session()
    engine = get_game_engine()
    
    try:
        # Validate result
        is_valid, error = engine.validate_result(
            challenge_id=request.challenge_id,
            client_result=request.result,
        )
        
        if not is_valid:
            return SubmitGameResultResponse(
                success=False,
                points_earned=0,
                validation_passed=False,
                error=error,
            )
        
        # Get player
        player = session.query(Player).filter(
            Player.wallet_address == wallet_address
        ).first()
        
        if not player:
            return SubmitGameResultResponse(
                success=False,
                points_earned=0,
                validation_passed=False,
                error="Player not found",
            )
        
        # Get equipped toys for bonus calculation
        equipped_toys = session.query(PlayerInventory).filter(
            PlayerInventory.player_address == wallet_address
        ).all()
        
        # Calculate toy bonus multiplier
        toy_multiplier = 1.0
        for inv in equipped_toys:
            nft_toy = session.query(NFTToy).filter(
                NFTToy.token_id == inv.token_id
            ).first()
            if nft_toy:
                # Sum stats for multiplier (simplified)
                total_stats = sum(nft_toy.stats_json.values())
                toy_multiplier += total_stats * 0.01  # 1% per stat point
        
        # Get daily bonuses
        today = date.today()
        daily_bonuses = session.query(DailyBonus).filter(
            DailyBonus.date == today
        ).all()
        
        daily_multiplier = 1.0
        for bonus in daily_bonuses:
            # Check if player has toy of this type equipped
            for inv in equipped_toys:
                nft_toy = session.query(NFTToy).filter(
                    NFTToy.token_id == inv.token_id
                ).first()
                if nft_toy and nft_toy.toy_type_id == bonus.toy_type_id:
                    daily_multiplier *= float(bonus.multiplier)
                    break
        
        # Calculate wager multiplier (simplified)
        wager_multiplier = 1.0  # TODO: Calculate based on wager amount
        
        # Calculate points
        challenge = engine.active_challenges.get(request.challenge_id)
        if not challenge:
            return SubmitGameResultResponse(
                success=False,
                points_earned=0,
                validation_passed=False,
                error="Challenge not found",
            )
        
        points_earned = engine.calculate_points(
            game_type=challenge.game_type,
            toy_multiplier=toy_multiplier,
            daily_multiplier=daily_multiplier,
            wager_multiplier=wager_multiplier,
        )
        
        # Update player stats
        player.total_points += points_earned
        player.games_played += 1
        player.last_active_at = datetime.utcnow()
        
        # Create game session record
        game_session = GameSession(
            player_address=wallet_address,
            game_type=challenge.game_type,
            wager_type="credits",  # TODO: Get from request
            wager_amount=0,  # TODO: Get from request
            points_earned=points_earned,
            base_points=engine.BASE_POINTS.get(challenge.game_type, 100),
            toy_bonus_multiplier=toy_multiplier,
            daily_bonus_multiplier=daily_multiplier,
            wager_multiplier=wager_multiplier,
            game_result_data=request.result,
            server_validation_hash=challenge.validation_hash,
            timestamp=datetime.utcnow(),
        )
        session.add(game_session)
        
        # Update leaderboard
        week_id = get_week_id()
        leaderboard_entry = session.query(Leaderboard).filter(
            Leaderboard.week_id == week_id,
            Leaderboard.player_address == wallet_address,
        ).first()
        
        if leaderboard_entry:
            leaderboard_entry.total_points = player.total_points
        else:
            leaderboard_entry = Leaderboard(
                week_id=week_id,
                player_address=wallet_address,
                total_points=player.total_points,
            )
            session.add(leaderboard_entry)
        
        session.commit()
        
        # Cleanup challenge
        del engine.active_challenges[request.challenge_id]
        
        return SubmitGameResultResponse(
            success=True,
            points_earned=points_earned,
            validation_passed=True,
        )
    
    except Exception as e:
        session.rollback()
        return SubmitGameResultResponse(
            success=False,
            points_earned=0,
            validation_passed=False,
            error=f"Game submission failed: {str(e)}",
        )
    finally:
        session.close()


# Leaderboard endpoints
class LeaderboardEntry(BaseModel):
    """Leaderboard entry response."""
    rank: int
    wallet_address: str
    nickname: Optional[str]
    total_points: int
    games_played: int
    badge: Optional[str]


@game_app.get("/leaderboard")
def get_leaderboard(
    period: str = "weekly",  # "weekly", "monthly", "alltime"
    limit: int = 100,
    db: GameDatabase = Depends(get_db),
) -> List[LeaderboardEntry]:
    """
    Get leaderboard rankings.
    
    Args:
        period: Time period ("weekly", "monthly", "alltime")
        limit: Maximum number of entries to return
    
    Returns:
        List of leaderboard entries sorted by rank
    """
    session = db.get_session()
    
    try:
        if period == "weekly":
            week_id = get_week_id()
            entries = session.query(Leaderboard).filter(
                Leaderboard.week_id == week_id
            ).order_by(Leaderboard.total_points.desc()).limit(limit).all()
        
        elif period == "monthly":
            # Get current month's week IDs
            today = datetime.utcnow()
            month_start = today.replace(day=1)
            # Simplified: get all entries from this month
            entries = session.query(Leaderboard).filter(
                Leaderboard.updated_at >= month_start
            ).order_by(Leaderboard.total_points.desc()).limit(limit).all()
        
        else:  # alltime
            # Get all players sorted by total points
            players = session.query(Player).order_by(
                Player.total_points.desc()
            ).limit(limit).all()
            
            result = []
            for rank, player in enumerate(players, start=1):
                result.append(LeaderboardEntry(
                    rank=rank,
                    wallet_address=player.wallet_address,
                    nickname=player.nickname,
                    total_points=player.total_points,
                    games_played=player.games_played,
                    badge=None,  # TODO: Calculate badge
                ))
            
            return result
        
        # Calculate ranks and build response
        result = []
        for rank, entry in enumerate(entries, start=1):
            player = session.query(Player).filter(
                Player.wallet_address == entry.player_address
            ).first()
            
            # Update rank in database
            entry.rank = rank
            if rank <= 3:
                badges = {1: "gold", 2: "silver", 3: "bronze"}
                entry.badge_earned = badges[rank]
            
            result.append(LeaderboardEntry(
                rank=rank,
                wallet_address=entry.player_address,
                nickname=player.nickname if player else None,
                total_points=entry.total_points,
                games_played=player.games_played if player else 0,
                badge=entry.badge_earned,
            ))
        
        session.commit()
        return result
    
    finally:
        session.close()


@game_app.get("/leaderboard/player/{wallet_address}")
def get_player_rank(
    wallet_address: str,
    period: str = "weekly",
    db: GameDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """Get player's current rank and position."""
    session = db.get_session()
    
    try:
        if period == "weekly":
            week_id = get_week_id()
            entry = session.query(Leaderboard).filter(
                Leaderboard.week_id == week_id,
                Leaderboard.player_address == wallet_address,
            ).first()
            
            if not entry:
                return {
                    "rank": None,
                    "total_points": 0,
                    "period": period,
                }
            
            # Calculate rank by counting players above
            rank = session.query(Leaderboard).filter(
                Leaderboard.week_id == week_id,
                Leaderboard.total_points > entry.total_points,
            ).count() + 1
            
            return {
                "rank": rank,
                "total_points": entry.total_points,
                "badge": entry.badge_earned,
                "period": period,
            }
        
        else:
            # For monthly/alltime, use player's total_points
            player = session.query(Player).filter(
                Player.wallet_address == wallet_address
            ).first()
            
            if not player:
                return {
                    "rank": None,
                    "total_points": 0,
                    "period": period,
                }
            
            # Calculate rank
            rank = session.query(Player).filter(
                Player.total_points > player.total_points
            ).count() + 1
            
            return {
                "rank": rank,
                "total_points": player.total_points,
                "badge": None,
                "period": period,
            }
    
    finally:
        session.close()


# Marketplace endpoints
class ListToyRequest(BaseModel):
    """Request to list a toy for sale."""
    token_id: int
    price_usdt0: int  # Price in atomic units (6 decimals)


class PurchaseListingRequest(BaseModel):
    """Request to purchase a listed toy."""
    listing_id: int
    payment: dict  # Payment via x402 flow (PaymentSubmitted)


@game_app.get("/marketplace/listings")
def get_marketplace_listings(
    toy_type_id: Optional[int] = None,
    rarity: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    limit: int = 50,
    db: GameDatabase = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Get active marketplace listings with filters."""
    session = db.get_session()
    
    try:
        query = session.query(MarketplaceListing).filter(
            MarketplaceListing.status == "active"
        )
        
        if toy_type_id:
            # Join with NFTToy to filter by toy_type_id
            query = query.join(NFTToy).filter(NFTToy.toy_type_id == toy_type_id)
        
        if rarity:
            query = query.join(NFTToy).filter(NFTToy.rarity == rarity)
        
        if min_price:
            query = query.filter(MarketplaceListing.price_usdt0 >= min_price)
        
        if max_price:
            query = query.filter(MarketplaceListing.price_usdt0 <= max_price)
        
        listings = query.order_by(
            MarketplaceListing.listed_at.desc()
        ).limit(limit).all()
        
        result = []
        for listing in listings:
            nft_toy = session.query(NFTToy).filter(
                NFTToy.token_id == listing.token_id
            ).first()
            
            toy_type = session.query(Toy).filter(
                Toy.id == nft_toy.toy_type_id
            ).first() if nft_toy else None
            
            result.append({
                "listing_id": listing.listing_id,
                "token_id": listing.token_id,
                "toy_name": toy_type.name if toy_type else "Unknown",
                "rarity": nft_toy.rarity if nft_toy else "unknown",
                "stats": nft_toy.stats_json if nft_toy else {},
                "seller_address": listing.seller_address,
                "price_usdt0": listing.price_usdt0,
                "price_usdt0_readable": listing.price_usdt0 / 1_000_000,
                "listed_at": listing.listed_at.isoformat(),
            })
        
        return result
    
    finally:
        session.close()


@game_app.post("/marketplace/list")
def list_toy(
    request: ListToyRequest,
    wallet_address: str,  # From auth
    db: GameDatabase = Depends(get_db),
) -> MarketplaceListingInfo:
    """List a toy for sale."""
    return list_toy_for_sale(
        token_id=request.token_id,
        seller_address=wallet_address,
        price_usdt0=request.price_usdt0,
        db=db,
    )


@game_app.post("/marketplace/purchase")
def purchase_listed_toy(
    request: PurchaseListingRequest,
    wallet_address: str,  # From auth
    db: GameDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """Purchase a listed toy."""
    # Verify payment first
    payment_submitted = PaymentSubmitted(**request.payment)
    completed = verify_and_settle(payment_submitted)
    
    if completed.status != "confirmed":
        raise HTTPException(status_code=400, detail="Payment not confirmed")
    
    return purchase_listing(
        listing_id=request.listing_id,
        buyer_address=wallet_address,
        payment_completed=completed.model_dump(),
        db=db,
    )


@game_app.post("/marketplace/sell-to-merchant/{token_id}")
def sell_toy_to_merchant(
    token_id: int,
    wallet_address: str,  # From auth
    db: GameDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """Sell toy back to merchant at 90% of purchase price."""
    return sell_to_merchant(
        token_id=token_id,
        seller_address=wallet_address,
        db=db,
    )


# Inventory endpoints
@game_app.get("/players/{wallet_address}/inventory")
def get_player_inventory(
    wallet_address: str,
    db: GameDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """Get player's inventory with equipped toys."""
    session = db.get_session()
    
    try:
        # Get all owned toys
        owned_toys = session.query(NFTToy).filter(
            NFTToy.owner_address == wallet_address
        ).all()
        
        # Get equipped toys
        equipped = session.query(PlayerInventory).filter(
            PlayerInventory.player_address == wallet_address
        ).order_by(PlayerInventory.slot_number).all()
        
        equipped_slots = {1: None, 2: None, 3: None}
        for inv in equipped:
            nft_toy = session.query(NFTToy).filter(
                NFTToy.token_id == inv.token_id
            ).first()
            
            toy_type = session.query(Toy).filter(
                Toy.id == nft_toy.toy_type_id
            ).first() if nft_toy else None
            
            equipped_slots[inv.slot_number] = {
                "token_id": inv.token_id,
                "toy_name": toy_type.name if toy_type else "Unknown",
                "rarity": nft_toy.rarity if nft_toy else "unknown",
                "stats": nft_toy.stats_json if nft_toy else {},
            }
        
        # Build owned toys list
        owned_list = []
        for nft_toy in owned_toys:
            toy_type = session.query(Toy).filter(
                Toy.id == nft_toy.toy_type_id
            ).first()
            
            # Check if equipped
            is_equipped = any(
                inv.token_id == nft_toy.token_id for inv in equipped
            )
            
            owned_list.append({
                "token_id": nft_toy.token_id,
                "toy_name": toy_type.name if toy_type else "Unknown",
                "rarity": nft_toy.rarity,
                "stats": nft_toy.stats_json,
                "mint_number": nft_toy.mint_number,
                "is_equipped": is_equipped,
            })
        
        return {
            "equipped": equipped_slots,
            "owned": owned_list,
        }
    
    finally:
        session.close()


class EquipToyRequest(BaseModel):
    """Request to equip/unequip a toy."""
    token_id: int
    slot_number: int  # 1, 2, or 3


@game_app.post("/players/{wallet_address}/inventory/equip")
def equip_toy(
    wallet_address: str,
    request: EquipToyRequest,
    db: GameDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """Equip a toy to a slot (or unequip if slot is 0)."""
    session = db.get_session()
    
    try:
        if request.slot_number < 1 or request.slot_number > 3:
            raise HTTPException(status_code=400, detail="Slot number must be 1, 2, or 3")
        
        # Verify ownership
        nft_toy = session.query(NFTToy).filter(
            NFTToy.token_id == request.token_id
        ).first()
        
        if not nft_toy:
            raise HTTPException(status_code=404, detail="Toy not found")
        
        if nft_toy.owner_address.lower() != wallet_address.lower():
            raise HTTPException(status_code=403, detail="Not the owner")
        
        # Check if already equipped in another slot
        existing = session.query(PlayerInventory).filter(
            PlayerInventory.token_id == request.token_id
        ).first()
        
        if existing:
            # Unequip from current slot
            session.delete(existing)
        
        # Check if slot is already occupied
        slot_occupied = session.query(PlayerInventory).filter(
            PlayerInventory.player_address == wallet_address,
            PlayerInventory.slot_number == request.slot_number,
        ).first()
        
        if slot_occupied:
            # Unequip from slot
            session.delete(slot_occupied)
        
        # Equip to new slot
        inventory = PlayerInventory(
            player_address=wallet_address,
            token_id=request.token_id,
            slot_number=request.slot_number,
            equipped_at=datetime.utcnow(),
        )
        
        session.add(inventory)
        session.commit()
        
        return {"success": True, "slot_number": request.slot_number}
    
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to equip toy: {str(e)}")
    finally:
        session.close()


@game_app.post("/players/{wallet_address}/inventory/unequip")
def unequip_toy(
    wallet_address: str,
    token_id: int,
    db: GameDatabase = Depends(get_db),
) -> Dict[str, Any]:
    """Unequip a toy from inventory."""
    session = db.get_session()
    
    try:
        inventory = session.query(PlayerInventory).filter(
            PlayerInventory.player_address == wallet_address,
            PlayerInventory.token_id == token_id,
        ).first()
        
        if not inventory:
            raise HTTPException(status_code=404, detail="Toy not equipped")
        
        session.delete(inventory)
        session.commit()
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to unequip toy: {str(e)}")
    finally:
        session.close()

