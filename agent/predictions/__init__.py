"""
Plasma Predictions Backend

Provides market mirroring from Polymarket, AMM price management,
and resolution tracking for the Plasma Predictions platform.

Components:
- sync: Market synchronization from Polymarket Gamma API
- models: Data models for prediction markets and bets
- routes: FastAPI endpoints for market data and betting
- oracle: Price and resolution mirroring
"""

from .models import (
    PredictionMarket,
    MarketCategory,
    Bet,
    BetStatus,
    LPPosition,
    LeaderboardEntry,
)
from .routes import router

__all__ = [
    "PredictionMarket",
    "MarketCategory",
    "Bet",
    "BetStatus",
    "LPPosition",
    "LeaderboardEntry",
    "router",
]
