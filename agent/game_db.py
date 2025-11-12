"""
Game Database Schema and Models

This module defines the PostgreSQL database schema for the Trillionaire Toy Store Game.
It includes tables for toys, NFTs, players, inventory, games, leaderboards, marketplace, and prizes.

The schema uses SQLAlchemy ORM for database operations and supports PostgreSQL-specific features.
"""

from __future__ import annotations

import json
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    BigInteger,
    Numeric,
    Boolean,
    DateTime,
    Date,
    JSON,
    ForeignKey,
    Index,
    Text,
    CheckConstraint,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()


class Toy(Base):
    """
    Toy type definitions - defines the catalog of available toy types.
    
    Each toy type has a base price, rarity distribution, stat categories,
    and a maximum mint limit (10 per type for scarcity).
    """
    __tablename__ = "toys"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    icon_name = Column(String(50), nullable=False)  # Component name for icon
    description = Column(Text, nullable=True)
    base_price_usdt0 = Column(BigInteger, nullable=False)  # Price in atomic units (6 decimals)
    max_mint_per_type = Column(Integer, default=10, nullable=False)
    stat_categories = Column(JSON, nullable=False)  # List of stat names: ["Speed", "Luck", "Power"]
    rarity_distribution = Column(JSON, nullable=False)  # {"common": 60, "rare": 25, "epic": 10, "legendary": 5}
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    nft_toys = relationship("NFTToy", back_populates="toy_type")
    daily_bonuses = relationship("DailyBonus", back_populates="toy_type")


class NFTToy(Base):
    """
    Minted NFT toys - represents actual NFT tokens minted on Plasma.
    
    Each NFT has a token_id, rarity tier, generated stats, and ownership information.
    Stats are generated based on toy type template and rarity multipliers.
    """
    __tablename__ = "nft_toys"
    
    token_id = Column(BigInteger, primary_key=True)
    toy_type_id = Column(Integer, ForeignKey("toys.id"), nullable=False, index=True)
    owner_address = Column(String(42), nullable=False, index=True)  # Ethereum address
    rarity = Column(String(20), nullable=False, index=True)  # common, rare, epic, legendary
    stats_json = Column(JSON, nullable=False)  # {"Speed": 10, "Luck": 5, ...}
    mint_number = Column(Integer, nullable=False)  # Sequential mint number for this toy type (1-10)
    minted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata_uri = Column(String(500), nullable=True)  # IPFS/metadata URI
    original_purchase_price = Column(BigInteger, nullable=True)  # For merchant buyback calculation
    
    # Relationships
    toy_type = relationship("Toy", back_populates="nft_toys")
    inventory_slots = relationship("PlayerInventory", back_populates="nft_toy")
    marketplace_listings = relationship("MarketplaceListing", back_populates="nft_toy")


class Player(Base):
    """
    Player accounts - tracks player wallet addresses, nicknames, credits, and points.
    
    Credits are off-chain tokens for free-to-play games without requiring wallet transactions.
    Points are earned from games and used for leaderboard rankings.
    """
    __tablename__ = "players"
    
    wallet_address = Column(String(42), primary_key=True, index=True)
    nickname = Column(String(20), nullable=True, unique=True, index=True)
    credits_balance = Column(Integer, default=100, nullable=False)  # Initial 100 credits
    total_points = Column(BigInteger, default=0, nullable=False, index=True)
    games_played = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_active_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    inventory = relationship("PlayerInventory", back_populates="player")
    game_sessions = relationship("GameSession", back_populates="player")
    leaderboard_entries = relationship("Leaderboard", back_populates="player")
    marketplace_listings = relationship("MarketplaceListing", back_populates="seller")
    marketplace_purchases = relationship("MarketplaceSale", foreign_keys="MarketplaceSale.buyer_address", back_populates="buyer")
    marketplace_sales = relationship("MarketplaceSale", foreign_keys="MarketplaceSale.seller_address", back_populates="seller")
    weekly_prizes = relationship("WeeklyPrize", back_populates="player")


class PlayerInventory(Base):
    """
    Player inventory - tracks which toys are equipped in the 3 inventory slots.
    
    Players can equip up to 3 toys at a time. Toys can be equipped/unequipped freely.
    Equipped toys provide stat bonuses during games.
    """
    __tablename__ = "player_inventory"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    player_address = Column(String(42), ForeignKey("players.wallet_address"), nullable=False, index=True)
    token_id = Column(BigInteger, ForeignKey("nft_toys.token_id"), nullable=False, unique=True)
    slot_number = Column(Integer, nullable=False)  # 1, 2, or 3
    equipped_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("slot_number >= 1 AND slot_number <= 3", name="check_slot_range"),
        Index("idx_player_slot", "player_address", "slot_number", unique=True),
    )
    
    # Relationships
    player = relationship("Player", back_populates="inventory")
    nft_toy = relationship("NFTToy", back_populates="inventory_slots")


class DailyBonus(Base):
    """
    Daily bonus rotation - tracks which toy types get bonuses each day.
    
    Each day, 3-5 random toy types are selected for bonuses with multipliers.
    Each bonus is tied to specific games (game_types array).
    Only toys with bonuses matching the "games of the day" provide multipliers.
    This encourages daily logins, toy variety, and strategic squad selection.
    """
    __tablename__ = "daily_bonuses"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    toy_type_id = Column(Integer, ForeignKey("toys.id"), nullable=False, index=True)
    multiplier = Column(Numeric(5, 2), nullable=False)  # e.g., 1.50, 2.00, 2.50, 3.00
    bonus_type = Column(String(20), nullable=False)  # "points", "credits", "wager_reduction"
    game_types = Column(JSON, nullable=True)  # Array of game types this bonus affects: ["memory_match", "reaction_time"]
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        Index("idx_date_toy", "date", "toy_type_id", unique=True),
    )
    
    # Relationships
    toy_type = relationship("Toy", back_populates="daily_bonuses")


class GamesOfTheDay(Base):
    """
    Games of the Day - tracks which 2 games are featured each day.
    
    Each day, 2 games are randomly selected as "games of the day".
    Only toys with daily bonuses matching these games provide multipliers.
    This creates strategic depth - players must select a "squad" of toys
    that match the featured games to maximize their bonuses.
    """
    __tablename__ = "games_of_the_day"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    game_type_1 = Column(String(50), nullable=False)  # First featured game
    game_type_2 = Column(String(50), nullable=False)  # Second featured game
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class GameSession(Base):
    """
    Game sessions - records all game plays with wagering and results.
    
    Tracks game type, wager type/amount, points earned, and server validation hash
    for anti-cheat purposes.
    """
    __tablename__ = "game_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    player_address = Column(String(42), ForeignKey("players.wallet_address"), nullable=False, index=True)
    game_type = Column(String(50), nullable=False, index=True)  # "reaction_time", "memory_match", "dice_roll", etc.
    wager_type = Column(String(20), nullable=False)  # "toy", "usdt0", "credits"
    wager_amount = Column(BigInteger, nullable=True)  # Amount in atomic units (for USDT0) or credits
    wager_token_id = Column(BigInteger, nullable=True)  # If wagering a toy NFT
    points_earned = Column(BigInteger, nullable=False, default=0)
    base_points = Column(BigInteger, nullable=False)  # Points before multipliers
    toy_bonus_multiplier = Column(Numeric(5, 2), nullable=False, default=1.0)
    daily_bonus_multiplier = Column(Numeric(5, 2), nullable=False, default=1.0)
    wager_multiplier = Column(Numeric(5, 2), nullable=False, default=1.0)
    game_result_data = Column(JSON, nullable=True)  # Game-specific result data
    server_validation_hash = Column(String(64), nullable=False)  # SHA256 hash for anti-cheat
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    player = relationship("Player", back_populates="game_sessions")


class Leaderboard(Base):
    """
    Leaderboard entries - tracks weekly rankings for prize distribution.
    
    Updated after each game session. Used to calculate weekly prize winners.
    Rankings are calculated dynamically but cached for performance.
    """
    __tablename__ = "leaderboard"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_id = Column(String(20), nullable=False, index=True)  # Format: "2025-W01"
    player_address = Column(String(42), ForeignKey("players.wallet_address"), nullable=False, index=True)
    total_points = Column(BigInteger, nullable=False, index=True)
    rank = Column(Integer, nullable=True)  # Calculated rank (1, 2, 3, ...)
    badge_earned = Column(String(50), nullable=True)  # "gold", "silver", "bronze", or None
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        Index("idx_week_player", "week_id", "player_address", unique=True),
        Index("idx_week_points", "week_id", "total_points", unique=False),
    )
    
    # Relationships
    player = relationship("Player", back_populates="leaderboard_entries")


class MarketplaceListing(Base):
    """
    Marketplace listings - toys listed for sale by players.
    
    Players can list their toys at custom prices. Listings can be active or cancelled.
    Dynamic pricing considers rarity, scarcity, and market demand.
    """
    __tablename__ = "marketplace_listings"
    
    listing_id = Column(Integer, primary_key=True, autoincrement=True)
    token_id = Column(BigInteger, ForeignKey("nft_toys.token_id"), nullable=False, unique=True, index=True)
    seller_address = Column(String(42), ForeignKey("players.wallet_address"), nullable=False, index=True)
    price_usdt0 = Column(BigInteger, nullable=False)  # Price in atomic units
    listed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = Column(String(20), default="active", nullable=False, index=True)  # "active", "sold", "cancelled"
    
    # Relationships
    nft_toy = relationship("NFTToy", back_populates="marketplace_listings")
    seller = relationship("Player", back_populates="marketplace_listings")
    sale = relationship("MarketplaceSale", back_populates="listing", uselist=False)


class MarketplaceSale(Base):
    """
    Marketplace sales - records completed toy sales.
    
    Tracks buyer, seller, price, fees, and transaction hash for transparency.
    Fees (1% of sale price) go to the weekly prize pool.
    """
    __tablename__ = "marketplace_sales"
    
    sale_id = Column(Integer, primary_key=True, autoincrement=True)
    listing_id = Column(Integer, ForeignKey("marketplace_listings.listing_id"), nullable=False, unique=True)
    buyer_address = Column(String(42), ForeignKey("players.wallet_address"), nullable=False, index=True)
    seller_address = Column(String(42), ForeignKey("players.wallet_address"), nullable=False, index=True)
    price_usdt0 = Column(BigInteger, nullable=False)  # Sale price in atomic units
    fee_usdt0 = Column(BigInteger, nullable=False)  # 1% fee in atomic units
    tx_hash = Column(String(66), nullable=True)  # Blockchain transaction hash
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    listing = relationship("MarketplaceListing", back_populates="sale")
    buyer = relationship("Player", foreign_keys=[buyer_address], back_populates="marketplace_purchases")
    seller = relationship("Player", foreign_keys=[seller_address], back_populates="marketplace_sales")


class WeeklyPrize(Base):
    """
    Weekly prize distribution - records USDT0 prizes distributed to leaderboard winners.
    
    Prizes are distributed every Friday. Prize pool is 50% of merchant fees accrued during the week.
    Distribution: 1st place (50%), 2nd place (30%), 3rd place (20%).
    """
    __tablename__ = "weekly_prizes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_id = Column(String(20), nullable=False, index=True)  # Format: "2025-W01"
    winner_address = Column(String(42), ForeignKey("players.wallet_address"), nullable=False, index=True)
    rank = Column(Integer, nullable=False)  # 1, 2, or 3
    prize_amount_usdt0 = Column(BigInteger, nullable=False)  # Prize in atomic units
    distributed_at = Column(DateTime, nullable=True)  # When prize was sent
    tx_hash = Column(String(66), nullable=True)  # Blockchain transaction hash
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    player = relationship("Player", back_populates="weekly_prizes")


class Prediction(Base):
    """
    Polymarket predictions - tracks user predictions and bets on Polymarket markets.
    
    Each prediction represents a user's bet on a Polymarket market outcome.
    Tracks the bet amount, conversion details, Polymarket order ID, and resolution.
    """
    __tablename__ = "predictions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_address = Column(String(42), nullable=False, index=True)  # Wallet address
    market_id = Column(String(100), nullable=False, index=True)  # Polymarket market ID
    market_question = Column(Text, nullable=True)  # Market question for display
    outcome = Column(String(50), nullable=False)  # YES/NO or outcome ID
    predicted_price = Column(Numeric(10, 4), nullable=True)  # User's predicted price (0-1)
    bet_amount_usdt0 = Column(BigInteger, nullable=False)  # Amount in USDT0 atomic units (6 decimals)
    bet_amount_usdc = Column(BigInteger, nullable=True)  # Converted amount in USDC atomic units (6 decimals)
    polymarket_order_id = Column(String(100), nullable=True, unique=True, index=True)  # Order ID from Polymarket API
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, placed, filled, cancelled, resolved
    conversion_tx_hash = Column(String(66), nullable=True)  # Transaction hash for USDT0→USDC conversion
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)  # When market resolved
    outcome_result = Column(String(50), nullable=True)  # Actual outcome when resolved
    profit_loss = Column(Numeric(20, 6), nullable=True)  # P&L when resolved (can be negative)
    resolved_price = Column(Numeric(10, 4), nullable=True)  # Final market price (0-1)


class PredictionLeaderboard(Base):
    """
    Prediction leaderboards - tracks user rankings based on prediction accuracy.
    
    Calculates rankings for different time periods (daily, weekly, monthly, all-time)
    based on accuracy percentage, total volume, and profit/loss.
    """
    __tablename__ = "prediction_leaderboards"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_address = Column(String(42), nullable=False, index=True)  # Wallet address
    period = Column(String(20), nullable=False, index=True)  # daily, weekly, monthly, alltime
    period_start = Column(Date, nullable=False, index=True)  # Start date of period
    total_predictions = Column(Integer, nullable=False, default=0)  # Total predictions made
    correct_predictions = Column(Integer, nullable=False, default=0)  # Correct predictions
    accuracy_percentage = Column(Numeric(5, 2), nullable=False, default=0)  # Win rate percentage
    total_volume_usdt0 = Column(BigInteger, nullable=False, default=0)  # Total volume bet in USDT0
    total_profit_loss = Column(Numeric(20, 6), nullable=False, default=0)  # Total P&L
    rank = Column(Integer, nullable=True, index=True)  # Calculated rank (1, 2, 3, ...)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Constraints
    __table_args__ = (
        Index("idx_user_period", "user_address", "period", "period_start", unique=True),
    )


class UserBalance(Base):
    """
    User balances - tracks pre-converted USDC balances for instant betting.
    
    Users deposit USDT0, which gets converted to USDC in the background.
    The USDC balance is credited and can be used immediately for betting.
    """
    __tablename__ = "user_balances"
    
    user_address = Column(String(42), primary_key=True, index=True)  # Wallet address
    usdc_balance = Column(BigInteger, nullable=False, default=0)  # Balance in USDC atomic units (6 decimals)
    pending_deposits = Column(BigInteger, nullable=False, default=0)  # USDT0 awaiting conversion
    total_deposited = Column(BigInteger, nullable=False, default=0)  # Lifetime deposits in USDT0
    total_withdrawn = Column(BigInteger, nullable=False, default=0)  # Lifetime withdrawals in USDT0
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Deposit(Base):
    """
    Deposits - tracks USDT0 deposits and their conversion to USDC.
    
    Each deposit represents a user's USDT0 payment that needs to be converted.
    Tracks the conversion status and transaction hashes.
    """
    __tablename__ = "deposits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_address = Column(String(42), nullable=False, index=True)  # Wallet address
    invoice_id = Column(String(100), nullable=True, unique=True, index=True)  # x402 invoice ID
    usdt0_amount = Column(BigInteger, nullable=False)  # Deposited amount in USDT0 atomic units
    usdc_amount = Column(BigInteger, nullable=True)  # Converted amount in USDC atomic units
    conversion_tx_hash = Column(String(66), nullable=True)  # Polygon conversion transaction
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, converting, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)  # When conversion completed


class UserProfile(Base):
    """
    User profiles - stores display names and profile information.
    
    Users can set display names that appear on leaderboards instead of wallet addresses.
    Display names are unique and 3-20 characters long.
    """
    __tablename__ = "user_profiles"
    
    wallet_address = Column(String(42), primary_key=True, index=True)  # Wallet address
    display_name = Column(String(20), nullable=True, unique=True, index=True)  # 3-20 characters, unique
    avatar_url = Column(String(500), nullable=True)  # Optional avatar image URL
    bio = Column(Text, nullable=True)  # Optional bio text
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LiquidityBuffer(Base):
    """
    Global liquidity buffer - tracks USDC balance on Polygon for instant betting.
    
    This is a singleton table (only one row) that tracks the available liquidity pool.
    The buffer balance limits the maximum bet amount globally across all users.
    When users bet, the buffer is deducted. When conversions complete, the buffer is replenished.
    
    Flow:
    1. User deposits USDT0 → Conversion completes → Buffer replenished
    2. User places bet → Buffer deducted → Bet placed on Polymarket
    3. Max bet = min(user_balance, buffer_balance)
    """
    __tablename__ = "liquidity_buffer"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    buffer_id = Column(String(50), nullable=False, unique=True, default="global", index=True)  # Singleton identifier
    usdc_balance = Column(BigInteger, nullable=False, default=0)  # Current USDC balance on Polygon (atomic units, 6 decimals)
    min_buffer_size = Column(BigInteger, nullable=False, default=10_000_000_000)  # Minimum buffer size (10,000 USDC default)
    max_buffer_size = Column(BigInteger, nullable=True)  # Maximum buffer size (optional cap)
    total_deposited = Column(BigInteger, nullable=False, default=0)  # Lifetime total deposited to buffer
    total_withdrawn = Column(BigInteger, nullable=False, default=0)  # Lifetime total withdrawn from buffer
    last_replenished_at = Column(DateTime, nullable=True)  # Last time buffer was replenished
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "buffer_id": self.buffer_id,
            "usdc_balance": int(self.usdc_balance),
            "usdc_balance_formatted": float(self.usdc_balance / 1_000_000),  # Convert to decimal
            "min_buffer_size": int(self.min_buffer_size),
            "min_buffer_size_formatted": float(self.min_buffer_size / 1_000_000),
            "max_buffer_size": int(self.max_buffer_size) if self.max_buffer_size else None,
            "max_buffer_size_formatted": float(self.max_buffer_size / 1_000_000) if self.max_buffer_size else None,
            "total_deposited": int(self.total_deposited),
            "total_withdrawn": int(self.total_withdrawn),
            "last_replenished_at": self.last_replenished_at.isoformat() if self.last_replenished_at else None,
            "updated_at": self.updated_at.isoformat(),
        }


# Database connection and session management
class GameDatabase:
    """
    Database connection manager for the game.
    
    Handles SQLAlchemy engine creation, session management, and database initialization.
    """
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize database connection.
        
        Args:
            database_url: PostgreSQL connection string (e.g., "postgresql://user:pass@localhost/gamedb")
                         If None, will try to get from environment variables
        """
        if database_url is None:
            import os
            from .config import settings
            database_url = settings.GAME_DATABASE_URL or os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL or GAME_DATABASE_URL must be set")
        
        self.engine = create_engine(database_url, pool_pre_ping=True, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def create_tables(self):
        """Create all database tables."""
        Base.metadata.create_all(bind=self.engine)
    
    def get_session(self) -> Session:
        """Get a new database session."""
        return self.SessionLocal()
    
    def close(self):
        """Close database connection."""
        self.engine.dispose()


# Helper function to get week ID from date
def get_week_id(dt: Optional[datetime] = None) -> str:
    """
    Get ISO week ID string (e.g., "2025-W01") for a given date.
    
    Args:
        dt: Datetime object (defaults to now)
    
    Returns:
        Week ID string in format "YYYY-WNN"
    """
    if dt is None:
        dt = datetime.utcnow()
    year, week, _ = dt.isocalendar()
    return f"{year}-W{week:02d}"

