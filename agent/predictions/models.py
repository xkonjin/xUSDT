"""
Prediction Market Data Models

Pydantic models for prediction markets, bets, and user data.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class MarketCategory(str, Enum):
    ALL = "all"
    POLITICS = "politics"
    CRYPTO = "crypto"
    SPORTS = "sports"
    TECH = "tech"
    ENTERTAINMENT = "entertainment"
    SCIENCE = "science"
    FINANCE = "finance"


class PredictionMarket(BaseModel):
    """A prediction market mirrored from Polymarket."""
    
    id: str = Field(..., description="Unique market ID")
    polymarket_id: Optional[str] = Field(None, description="Polymarket condition ID")
    condition_id: str = Field(..., description="On-chain condition ID")
    question: str = Field(..., description="Market question")
    description: Optional[str] = Field(None, description="Market description")
    category: MarketCategory = Field(default=MarketCategory.ALL)
    end_date: datetime = Field(..., description="Resolution date")
    resolved: bool = Field(default=False)
    outcome: Optional[str] = Field(None, description="Resolution outcome (YES/NO)")
    yes_price: float = Field(..., ge=0, le=1, description="Current YES price")
    no_price: float = Field(..., ge=0, le=1, description="Current NO price")
    volume_24h: float = Field(default=0, description="24-hour volume in USDT0")
    total_volume: float = Field(default=0, description="Total volume in USDT0")
    liquidity: float = Field(default=0, description="Pool liquidity in USDT0")
    image_url: Optional[str] = Field(None, description="Market image")
    polymarket_url: Optional[str] = Field(None, description="Polymarket URL")
    amm_address: Optional[str] = Field(None, description="AMM contract address")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True


class BetStatus(str, Enum):
    ACTIVE = "active"
    WON = "won"
    LOST = "lost"
    CASHED_OUT = "cashed_out"


class Bet(BaseModel):
    """A user's bet on a prediction market."""
    
    id: str = Field(..., description="Unique bet ID")
    market_id: str = Field(..., description="Market ID")
    user_address: str = Field(..., description="User wallet address")
    outcome: str = Field(..., description="YES or NO")
    shares: float = Field(..., ge=0, description="Number of outcome tokens")
    cost_basis: float = Field(..., ge=0, description="Amount paid for shares")
    current_value: float = Field(default=0, description="Current market value")
    pnl: float = Field(default=0, description="Profit/loss in USDT0")
    pnl_percent: float = Field(default=0, description="Profit/loss percentage")
    status: BetStatus = Field(default=BetStatus.ACTIVE)
    placed_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(None)
    tx_hash: str = Field(..., description="Transaction hash")

    class Config:
        use_enum_values = True


class LPPosition(BaseModel):
    """A user's liquidity provider position."""
    
    id: str = Field(..., description="Position ID")
    market_id: str = Field(..., description="Market ID")
    user_address: str = Field(..., description="User wallet address")
    lp_tokens: float = Field(..., ge=0)
    deposited_amount: float = Field(..., ge=0)
    current_value: float = Field(default=0)
    fees_earned: float = Field(default=0)
    apy: float = Field(default=0)
    deposited_at: datetime = Field(default_factory=datetime.utcnow)


class LeaderboardEntry(BaseModel):
    """Leaderboard entry for top predictors."""
    
    rank: int = Field(..., ge=1)
    address: str = Field(..., description="User wallet address")
    display_name: Optional[str] = Field(None)
    profit: float = Field(default=0)
    accuracy: float = Field(default=0, ge=0, le=1)
    total_bets: int = Field(default=0)
    volume: float = Field(default=0)


class MarketFilters(BaseModel):
    """Filters for market queries."""
    
    category: Optional[MarketCategory] = None
    search: Optional[str] = None
    sort_by: Optional[str] = Field(default="volume")
    resolved: Optional[bool] = None
    page: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)


class PlaceBetRequest(BaseModel):
    """Request to place a bet."""
    
    market_id: str
    outcome: str = Field(..., description="YES or NO")
    amount: str = Field(..., description="Amount in atomic units")
    min_amount_out: str = Field(..., description="Minimum shares to receive")
    authorization: dict = Field(..., description="EIP-3009 authorization")
    signature: dict = Field(..., description="Signature components (v,r,s)")


class PlaceBetResponse(BaseModel):
    """Response from placing a bet."""
    
    success: bool
    tx_hash: Optional[str] = None
    shares: Optional[float] = None
    error: Optional[str] = None


class CashOutRequest(BaseModel):
    """Request to cash out a bet."""
    
    bet_id: str
    shares: str = Field(..., description="Shares to sell")
    min_amount_out: str = Field(..., description="Minimum USDT0 to receive")


class CashOutResponse(BaseModel):
    """Response from cashing out."""
    
    success: bool
    tx_hash: Optional[str] = None
    amount: Optional[float] = None
    error: Optional[str] = None


class MarketResponse(BaseModel):
    """Response containing markets."""
    
    markets: List[PredictionMarket]
    total: int
    page: int
    has_more: bool


class UserStatsResponse(BaseModel):
    """User statistics."""
    
    address: str
    total_bets: int = 0
    active_bets: int = 0
    total_won: float = 0
    total_lost: float = 0
    win_rate: float = 0
    portfolio_value: float = 0
    total_pnl: float = 0
    rank: Optional[int] = None
