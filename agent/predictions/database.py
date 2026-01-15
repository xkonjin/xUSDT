"""
Database configuration for Plasma Predictions

Uses SQLAlchemy async with PostgreSQL (or SQLite for development).
"""

import os
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    BigInteger, Text, ForeignKey, Index, Enum as SQLEnum,
    create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.pool import StaticPool
import enum

# Database URL from environment
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    "sqlite:///./predictions.db"  # Default to SQLite for development
)

# Create engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class BetStatusDB(enum.Enum):
    ACTIVE = "active"
    WON = "won"
    LOST = "lost"
    CASHED_OUT = "cashed_out"


class User(Base):
    __tablename__ = "users"
    
    address = Column(String(42), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    referrer_address = Column(String(42), nullable=True)
    current_streak = Column(Integer, default=0)
    max_streak = Column(Integer, default=0)
    last_bet_date = Column(DateTime, nullable=True)
    total_volume = Column(BigInteger, default=0)
    
    bets = relationship("Bet", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")


class Market(Base):
    __tablename__ = "markets"
    
    id = Column(String(255), primary_key=True)
    question = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    image_url = Column(String(500), nullable=True)
    yes_price = Column(Float, default=0.5)
    no_price = Column(Float, default=0.5)
    volume = Column(BigInteger, default=0)
    liquidity = Column(BigInteger, default=0)
    end_date = Column(DateTime, nullable=True)
    resolved = Column(Boolean, default=False)
    winning_outcome = Column(String(10), nullable=True)
    polymarket_id = Column(String(255), nullable=True)
    last_synced = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    bets = relationship("Bet", back_populates="market")
    price_history = relationship("PriceHistory", back_populates="market")
    
    __table_args__ = (
        Index("idx_markets_category", "category"),
        Index("idx_markets_resolved", "resolved"),
        Index("idx_markets_end_date", "end_date"),
    )


class Bet(Base):
    __tablename__ = "bets"
    
    id = Column(String(36), primary_key=True)
    user_address = Column(String(42), ForeignKey("users.address"), nullable=False)
    market_id = Column(String(255), ForeignKey("markets.id"), nullable=False)
    outcome = Column(String(10), nullable=False)  # YES or NO
    shares = Column(Float, nullable=False)
    cost_basis = Column(Float, nullable=False)  # Amount paid in USDT
    current_value = Column(Float, default=0)
    pnl = Column(Float, default=0)
    pnl_percent = Column(Float, default=0)
    status = Column(SQLEnum(BetStatusDB), default=BetStatusDB.ACTIVE)
    tx_hash = Column(String(66), nullable=True)
    placed_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    payout_amount = Column(Float, nullable=True)
    
    user = relationship("User", back_populates="bets")
    market = relationship("Market", back_populates="bets")
    
    __table_args__ = (
        Index("idx_bets_user", "user_address"),
        Index("idx_bets_market", "market_id"),
        Index("idx_bets_status", "status"),
    )


class PriceHistory(Base):
    __tablename__ = "price_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    market_id = Column(String(255), ForeignKey("markets.id"), nullable=False)
    outcome = Column(String(10), nullable=False)
    price = Column(Float, nullable=False)
    volume = Column(BigInteger, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    market = relationship("Market", back_populates="price_history")
    
    __table_args__ = (
        Index("idx_price_history_lookup", "market_id", "outcome", "timestamp"),
    )


class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(10), nullable=True)
    category = Column(String(50), nullable=True)
    requirement_type = Column(String(50), nullable=True)
    requirement_value = Column(Integer, nullable=True)


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    user_address = Column(String(42), ForeignKey("users.address"), primary_key=True)
    achievement_id = Column(String(50), ForeignKey("achievements.id"), primary_key=True)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")


class Competition(Base):
    __tablename__ = "competitions"
    
    id = Column(String(36), primary_key=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    prize_pool_usdt = Column(BigInteger, default=0)
    status = Column(String(20), default="active")


class CompetitionEntry(Base):
    __tablename__ = "competition_entries"
    
    competition_id = Column(String(36), ForeignKey("competitions.id"), primary_key=True)
    user_address = Column(String(42), ForeignKey("users.address"), primary_key=True)
    points = Column(Float, default=0)
    correct_predictions = Column(Integer, default=0)
    total_bets = Column(Integer, default=0)
    profit_percent = Column(Float, default=0)
    rank = Column(Integer, nullable=True)
    prize_won = Column(BigInteger, nullable=True)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)


# Initialize on import (for development)
if DATABASE_URL.startswith("sqlite"):
    init_db()
