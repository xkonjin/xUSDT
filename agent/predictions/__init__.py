"""
Plasma Predictions Backend

Provides market mirroring from Polymarket, AMM price management,
and resolution tracking for the Plasma Predictions platform.

Components:
- sync: Market synchronization from Polymarket Gamma API
- models: Data models for prediction markets and bets
- routes: FastAPI endpoints for market data and betting
- auth: Authentication middleware (Privy JWT, EIP-712)
- ratelimit: Rate limiting with slowapi
- database: SQLAlchemy models for PostgreSQL
- websocket: Real-time price updates via WebSocket
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
from .auth import require_auth, get_optional_user, verify_eip3009_authorization
from .ratelimit import limiter, setup_rate_limiting
from .database import init_db, get_db, User, Market, Bet as BetDB
from .websocket import (
    manager as ws_manager,
    broadcast_price_update,
    broadcast_bet_activity,
    get_websocket_stats,
)

__all__ = [
    # Models
    "PredictionMarket",
    "MarketCategory",
    "Bet",
    "BetStatus",
    "LPPosition",
    "LeaderboardEntry",
    # Router
    "router",
    # Auth
    "require_auth",
    "get_optional_user",
    "verify_eip3009_authorization",
    # Rate limiting
    "limiter",
    "setup_rate_limiting",
    # Database
    "init_db",
    "get_db",
    "User",
    "Market",
    "BetDB",
    # WebSocket
    "ws_manager",
    "broadcast_price_update",
    "broadcast_bet_activity",
    "get_websocket_stats",
]
